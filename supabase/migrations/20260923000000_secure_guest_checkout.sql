-- Apply before deploying the new checkout client. Anonymous order policies are
-- removed by the separate cutover migration after the client is live.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_key UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_key_unique ON public.orders(checkout_key) WHERE checkout_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.kv_place_order(
  p_key UUID, p_customer JSONB, p_cart JSONB, p_shipping NUMERIC, p_cod BOOLEAN, p_expected NUMERIC
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing public.orders%ROWTYPE;
  v_line JSONB;
  v_product public.products%ROWTYPE;
  v_variant public.product_variants%ROWTYPE;
  v_combo public.combos%ROWTYPE;
  v_group TEXT;
  v_count INTEGER;
  v_qty INTEGER;
  v_total_items INTEGER := 0;
  v_price NUMERIC;
  v_subtotal NUMERIC := 0;
  v_cod_fee NUMERIC;
  v_items JSONB := '[]'::jsonb;
  v_order public.orders%ROWTYPE;
  v_index INTEGER := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role_required'; END IF;
  IF p_key IS NULL OR jsonb_typeof(p_cart) <> 'array' OR jsonb_array_length(p_cart) < 1 OR jsonb_array_length(p_cart) > 50
    OR p_shipping IS NULL OR p_shipping < 0 OR p_shipping > 100000 THEN RAISE EXCEPTION 'invalid_checkout'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_key::text));
  SELECT * INTO v_existing FROM public.orders WHERE checkout_key = p_key;
  IF FOUND THEN RETURN jsonb_build_object('id',v_existing.id,'order_number',v_existing.order_number,'total',v_existing.total,'payment_status',v_existing.payment_status); END IF;

  -- Validate each combo as a whole before reserving any stock.
  FOR v_group IN SELECT DISTINCT line->'combo'->>'combo_line' FROM jsonb_array_elements(p_cart) line WHERE line->'combo'->>'combo_line' IS NOT NULL LOOP
    SELECT * INTO v_combo FROM public.combos WHERE id = (SELECT line->'combo'->>'combo_id' FROM jsonb_array_elements(p_cart) line WHERE line->'combo'->>'combo_line'=v_group LIMIT 1)::uuid AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'combo_unavailable'; END IF;
    SELECT count(*),min((line->>'quantity')::integer) INTO v_count,v_qty FROM jsonb_array_elements(p_cart) line WHERE line->'combo'->>'combo_line'=v_group;
    IF v_count <> v_combo.choose_count OR v_qty < 1 OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_cart) line WHERE line->'combo'->>'combo_line'=v_group
      AND ((line->'combo'->>'combo_id')::uuid <> v_combo.id OR (line->>'quantity')::integer <> v_qty
        OR NOT EXISTS (SELECT 1 FROM public.combo_products cp WHERE cp.combo_id=v_combo.id AND cp.product_id=(line->>'id')::uuid))
    ) OR (NOT v_combo.allow_duplicates AND (SELECT count(DISTINCT line->>'id') FROM jsonb_array_elements(p_cart) line WHERE line->'combo'->>'combo_line'=v_group) <> v_count)
    THEN RAISE EXCEPTION 'invalid_combo'; END IF;
  END LOOP;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_cart) LOOP
    v_index := v_index + 1;
    v_qty := (v_line->>'quantity')::integer;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 99 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
    SELECT * INTO v_product FROM public.products WHERE id=(v_line->>'id')::uuid AND is_active FOR UPDATE;
    IF NOT FOUND OR v_product.is_wholesale THEN RAISE EXCEPTION 'product_unavailable'; END IF;
    IF v_product.has_variants THEN
      SELECT * INTO v_variant FROM public.product_variants WHERE id=(v_line->>'variant_id')::uuid AND product_id=v_product.id AND is_active FOR UPDATE;
      IF NOT FOUND OR v_variant.stock_quantity < v_qty THEN RAISE EXCEPTION 'variant_unavailable'; END IF;
      UPDATE public.product_variants SET stock_quantity=stock_quantity-v_qty WHERE id=v_variant.id;
      v_price := v_product.price + v_variant.price_adjustment;
    ELSE
      IF v_line->>'variant_id' IS NOT NULL OR v_product.stock_quantity < v_qty THEN RAISE EXCEPTION 'product_unavailable'; END IF;
      UPDATE public.products SET stock_quantity=stock_quantity-v_qty,in_stock=stock_quantity-v_qty>0 WHERE id=v_product.id;
      v_price := v_product.price;
    END IF;
    v_group := v_line->'combo'->>'combo_line';
    IF v_group IS NOT NULL THEN
      SELECT * INTO v_combo FROM public.combos WHERE id=(v_line->'combo'->>'combo_id')::uuid;
      SELECT count(*) INTO v_count FROM jsonb_array_elements(p_cart) line WHERE line->'combo'->>'combo_line'=v_group;
      -- Same cent allocation as the storefront: remainder on first selected line.
      v_price := trunc(v_combo.combo_price*100/v_count)/100;
      IF (SELECT count(*) FROM jsonb_array_elements(p_cart) WITH ORDINALITY AS line(value,position) WHERE line.value->'combo'->>'combo_line'=v_group AND line.position<v_index)=0
      THEN v_price := v_price+(v_combo.combo_price-v_price*v_count); END IF;
    END IF;
    v_total_items := v_total_items + v_qty;
    v_subtotal := v_subtotal + v_price*v_qty;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'product_id',v_product.id,'product_name',v_product.name,'product_image',v_product.image_url,
      'price',v_price,'quantity',v_qty,'subtotal',v_price*v_qty,
      'variant_id',CASE WHEN v_product.has_variants THEN v_variant.id ELSE NULL END,
      'color_id',CASE WHEN v_product.has_variants THEN v_variant.color_id ELSE NULL END,
      'color_name',CASE WHEN v_product.has_variants THEN (SELECT name FROM public.product_colors WHERE id=v_variant.color_id) ELSE NULL END,
      'size',CASE WHEN v_product.has_variants THEN v_variant.size ELSE NULL END,
      'combo',CASE WHEN v_group IS NOT NULL THEN jsonb_build_object('combo_id',v_combo.id,'combo_name',v_combo.name,'combo_line',v_group,'combo_price',v_combo.combo_price) ELSE NULL END));
  END LOOP;
  IF v_total_items > 99 OR (p_cod AND v_subtotal < 1000) THEN RAISE EXCEPTION 'checkout_not_allowed'; END IF;
  v_cod_fee := CASE WHEN p_cod THEN round((v_subtotal+p_shipping)*0.016) ELSE 0 END;
  IF p_expected IS NULL OR abs(p_expected-(v_subtotal+p_shipping+v_cod_fee)) > 0.009 THEN RAISE EXCEPTION 'checkout_total_changed'; END IF;
  INSERT INTO public.orders (checkout_key,reservation_expires_at,order_number,customer_name,customer_phone,customer_email,customer_address,customer_city,customer_state,customer_pincode,items,subtotal,shipping,cod_charges,total,status,payment_status,payment_method)
  VALUES (p_key,CASE WHEN p_cod THEN NULL ELSE now()+interval '30 minutes' END,
    'KV-'||to_char(now() AT TIME ZONE 'UTC','YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
    p_customer->>'name',p_customer->>'phone',nullif(p_customer->>'email',''),p_customer->>'address',p_customer->>'city',p_customer->>'state',p_customer->>'pincode',
    v_items,v_subtotal,p_shipping,v_cod_fee,v_subtotal+p_shipping+v_cod_fee,
    CASE WHEN p_cod THEN 'confirmed' ELSE 'pending' END,CASE WHEN p_cod THEN 'cod' ELSE 'pending' END,CASE WHEN p_cod THEN 'cod' ELSE 'online' END)
  RETURNING * INTO v_order;
  RETURN jsonb_build_object('id',v_order.id,'order_number',v_order.order_number,'total',v_order.total,'payment_status',v_order.payment_status);
END;
$$;
REVOKE ALL ON FUNCTION public.kv_place_order(UUID,JSONB,JSONB,NUMERIC,BOOLEAN,NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kv_place_order(UUID,JSONB,JSONB,NUMERIC,BOOLEAN,NUMERIC) TO service_role;

CREATE TABLE IF NOT EXISTS public.kv_payment_exceptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  razorpay_payment_id TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kv_payment_exceptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kv_payment_exceptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.kv_payment_exceptions TO authenticated;
DROP POLICY IF EXISTS "Orders staff read payment exceptions" ON public.kv_payment_exceptions;
CREATE POLICY "Orders staff read payment exceptions" ON public.kv_payment_exceptions FOR SELECT TO authenticated USING (public.admin_can('orders'));

CREATE OR REPLACE FUNCTION public.kv_release_expired() RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_order public.orders%ROWTYPE; v_line JSONB; v_count INTEGER := 0;
BEGIN
  FOR v_order IN SELECT * FROM public.orders WHERE payment_status='pending' AND reservation_expires_at<now() FOR UPDATE SKIP LOCKED LOOP
    FOR v_line IN SELECT value FROM jsonb_array_elements(v_order.items) LOOP
      IF v_line->>'variant_id' IS NOT NULL THEN
        UPDATE public.product_variants SET stock_quantity=stock_quantity+(v_line->>'quantity')::integer WHERE id=(v_line->>'variant_id')::uuid;
      ELSE
        UPDATE public.products SET stock_quantity=stock_quantity+(v_line->>'quantity')::integer,in_stock=true WHERE id=(v_line->>'product_id')::uuid;
      END IF;
    END LOOP;
    UPDATE public.orders SET status='cancelled',payment_status='failed',reservation_expires_at=NULL WHERE id=v_order.id;
    v_count := v_count+1;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.kv_release_expired() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kv_release_expired() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.schedule('kv-expired-order-reservations','*/5 * * * *','SELECT public.kv_release_expired();');
  END IF;
END $$;

-- Old checkout function remains callable until the website cutover is verified.
