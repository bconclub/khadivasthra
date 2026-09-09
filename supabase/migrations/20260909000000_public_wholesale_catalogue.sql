-- Public wholesale browsing, requested by the store owner.
-- Keep account, enquiry and all write policies unchanged.
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
COMMIT;
