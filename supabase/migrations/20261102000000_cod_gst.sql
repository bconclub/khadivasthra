-- COD fee is 1.6% of the order plus 18% GST on that fee.
-- Only the cod_charges line changes from the previous version of this function.
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

  -- COD charge and total follow the discounted amount.
  IF NEW.payment_method = 'cod' THEN
    NEW.cod_charges := round((NEW.subtotal - NEW.discount + coalesce(NEW.shipping,0)) * 0.016 * 1.18);
  ELSE
    NEW.cod_charges := 0;
  END IF;
  NEW.total := NEW.subtotal - NEW.discount + coalesce(NEW.shipping,0) + coalesce(NEW.cod_charges,0);
  RETURN NEW;
END $$;
