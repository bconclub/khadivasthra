CREATE TABLE IF NOT EXISTS public.kv_assisted_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  items JSONB NOT NULL CHECK (jsonb_typeof(items)='array'),
  phone TEXT,
  order_id UUID UNIQUE REFERENCES public.orders(id),
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  human_takeover BOOLEAN NOT NULL DEFAULT false,
  purchased_at TIMESTAMPTZ,
  reminder_2h TEXT NOT NULL DEFAULT 'pending' CHECK (reminder_2h IN ('pending','claimed','sent','held')),
  reminder_24h TEXT NOT NULL DEFAULT 'pending' CHECK (reminder_24h IN ('pending','claimed','sent','held')),
  reminder_2h_message_id TEXT,
  reminder_24h_message_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kv_assisted_carts_due ON public.kv_assisted_carts(updated_at) WHERE marketing_opt_in AND purchased_at IS NULL;
ALTER TABLE public.kv_assisted_carts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kv_assisted_carts FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.kv_claim_recovery(p_stage TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_cart public.kv_assisted_carts%ROWTYPE; v_field TEXT;
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service_role_required'; END IF;
  IF p_stage NOT IN ('2h','24h') THEN RAISE EXCEPTION 'invalid_stage'; END IF;
  v_field := CASE WHEN p_stage='2h' THEN 'reminder_2h' ELSE 'reminder_24h' END;
  SELECT * INTO v_cart FROM public.kv_assisted_carts c
    WHERE c.marketing_opt_in AND NOT c.human_takeover AND c.phone IS NOT NULL AND c.purchased_at IS NULL
      AND ((p_stage='2h' AND c.reminder_2h='pending' AND c.updated_at<now()-interval '2 hours')
        OR (p_stage='24h' AND c.reminder_2h='sent' AND c.reminder_24h='pending' AND c.updated_at<now()-interval '24 hours'))
      AND (now() AT TIME ZONE 'Asia/Kolkata')::time >= time '09:00' AND (now() AT TIME ZONE 'Asia/Kolkata')::time < time '20:00'
      AND NOT EXISTS (SELECT 1 FROM public.kv_assisted_carts newer WHERE newer.phone=c.phone AND newer.marketing_opt_in AND newer.purchased_at IS NULL AND newer.updated_at>c.updated_at)
      AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.customer_phone=c.phone AND o.created_at>=c.created_at AND (o.payment_status='paid' OR o.payment_status='cod'))
    ORDER BY c.updated_at FOR UPDATE SKIP LOCKED LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF p_stage='2h' THEN UPDATE public.kv_assisted_carts SET reminder_2h='claimed' WHERE id=v_cart.id;
  ELSE UPDATE public.kv_assisted_carts SET reminder_24h='claimed' WHERE id=v_cart.id; END IF;
  RETURN jsonb_build_object('id',v_cart.id,'phone',v_cart.phone,'stage',p_stage,'cartUrl','https://www.khadivasthra.com/cart/?cart='||v_cart.id);
END;
$$;
REVOKE ALL ON FUNCTION public.kv_claim_recovery(TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kv_claim_recovery(TEXT) TO service_role;
