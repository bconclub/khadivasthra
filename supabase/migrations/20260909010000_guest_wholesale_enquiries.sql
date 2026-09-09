-- Guest wholesale enquiries. Existing records and private read policies stay intact.
BEGIN;
DROP POLICY IF EXISTS "Public reads active wholesale prices" ON public.wholesale_prices;
CREATE POLICY "Public reads active wholesale prices"
ON public.wholesale_prices FOR SELECT TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.settings s WHERE s.wholesale_enabled = true)
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = wholesale_prices.product_id
      AND p.is_active = true AND p.is_wholesale = true
  )
);

ALTER TABLE public.wholesale_enquiries
  ALTER COLUMN account_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT;

CREATE OR REPLACE FUNCTION public.submit_guest_wholesale_enquiry(
  requested_items JSONB,
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_business TEXT DEFAULT '',
  buyer_notes TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  requested RECORD;
  product RECORD;
  canonical_items JSONB := '[]'::jsonb;
  pieces INTEGER := 0;
  amount NUMERIC := 0;
  reference TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.settings WHERE wholesale_enabled = true) THEN
    RAISE EXCEPTION 'Wholesale is currently closed.';
  END IF;
  IF COALESCE(length(trim(buyer_name)), 0) NOT BETWEEN 1 AND 120
    OR COALESCE(length(buyer_phone), 0) > 30
    OR COALESCE(length(regexp_replace(buyer_phone, '[^0-9]', '', 'g')), 0) NOT BETWEEN 7 AND 15
    OR COALESCE(length(buyer_business), 0) > 120
    OR COALESCE(length(buyer_notes), 0) > 2000 THEN
    RAISE EXCEPTION 'Enter valid contact details.';
  END IF;
  IF requested_items IS NULL OR jsonb_typeof(requested_items) <> 'array' THEN
    RAISE EXCEPTION 'Choose products for your enquiry.';
  END IF;
  IF jsonb_array_length(requested_items) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Choose between 1 and 100 products.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(requested_items) item
    WHERE COALESCE(item->>'quantity', '') !~ '^[1-9][0-9]{0,4}$'
      OR COALESCE(item->>'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) THEN RAISE EXCEPTION 'Invalid product or quantity.'; END IF;

  FOR requested IN
    SELECT (item->>'product_id')::uuid AS id, sum((item->>'quantity')::integer)::integer AS qty
    FROM jsonb_array_elements(requested_items) item GROUP BY 1
  LOOP
    SELECT p.id, p.name, p.image_url, w.price, w.min_qty INTO product
    FROM public.products p JOIN public.wholesale_prices w ON w.product_id = p.id
    WHERE p.id = requested.id AND p.is_active AND p.is_wholesale;
    IF NOT FOUND THEN RAISE EXCEPTION 'A selected product is no longer available for wholesale.'; END IF;
    IF requested.qty < greatest(1, product.min_qty) OR requested.qty > 99999 THEN
      RAISE EXCEPTION 'Quantity for % must be between % and 99999.', product.name, greatest(1, product.min_qty);
    END IF;
    IF product.price <= 0 THEN RAISE EXCEPTION 'A selected product has no valid wholesale price.'; END IF;
    canonical_items := canonical_items || jsonb_build_array(jsonb_build_object(
      'product_id', product.id, 'product_name', product.name, 'product_image', product.image_url,
      'wholesale_price', product.price, 'quantity', requested.qty,
      'subtotal', product.price * requested.qty, 'min_qty', product.min_qty
    ));
    pieces := pieces + requested.qty;
    amount := amount + product.price * requested.qty;
  END LOOP;

  INSERT INTO public.wholesale_enquiries
    (account_id, contact_name, contact_phone, business_name, items, item_count, estimated_total, notes)
  VALUES (NULL, trim(buyer_name), trim(buyer_phone), trim(buyer_business), canonical_items, pieces, amount, buyer_notes)
  RETURNING enquiry_number INTO reference;
  RETURN reference;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_guest_wholesale_enquiry(JSONB, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_wholesale_enquiry(JSONB, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
COMMIT;
