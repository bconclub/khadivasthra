-- Advance taken on a COD order (for example the COD charges, paid by UPI up
-- front). The courier collects only total - advance_paid on delivery.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS advance_paid NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_advance_paid_nonneg;
ALTER TABLE orders ADD CONSTRAINT orders_advance_paid_nonneg CHECK (advance_paid >= 0);

-- Only admins may record an advance on insert; checkout always starts at 0,
-- so a checkout request can't lower what the courier collects.
CREATE OR REPLACE FUNCTION public.orders_apply_coupon()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
BEGIN
  IF NEW.coupon_code IS NULL OR trim(NEW.coupon_code) = '' THEN
    NEW.coupon_code := NULL;
    NEW.discount := 0;
    NEW.referrer_name := NULL;
    NEW.referral_source := NULL;
  ELSE
    SELECT * INTO r FROM public.evaluate_coupon(NEW.coupon_code, NEW.subtotal);
    IF NOT r.valid THEN
      RAISE EXCEPTION 'Coupon %: %', NEW.coupon_code, r.message USING ERRCODE = 'check_violation';
    END IF;
    NEW.coupon_code := r.code;
    NEW.discount := r.discount;
    NEW.referrer_name := nullif(r.owner_name, '');
    IF NEW.referral_source IS NULL THEN NEW.referral_source := 'code'; END IF;
    UPDATE coupons SET used_count = used_count + 1 WHERE coupons.code = r.code;
  END IF;

  -- COD charge and total follow the discounted amount, unless an admin typed
  -- the fee in when creating the order.
  IF NEW.payment_method = 'cod' THEN
    IF public.is_admin() AND NEW.cod_charges IS NOT NULL THEN
      NEW.cod_charges := greatest(NEW.cod_charges, 0);
    ELSE
      NEW.cod_charges := round((NEW.subtotal - NEW.discount + coalesce(NEW.shipping,0)) * 0.016 * 1.18);
    END IF;
  ELSE
    NEW.cod_charges := 0;
  END IF;
  NEW.total := NEW.subtotal - NEW.discount + coalesce(NEW.shipping,0) + coalesce(NEW.cod_charges,0);

  IF NEW.payment_method = 'cod' AND public.is_admin() THEN
    NEW.advance_paid := least(greatest(coalesce(NEW.advance_paid, 0), 0), NEW.total);
  ELSE
    NEW.advance_paid := 0;
  END IF;
  RETURN NEW;
END
$$;
