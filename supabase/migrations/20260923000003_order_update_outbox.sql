-- Apply after secure checkout and before enabling order-update templates.
CREATE TABLE IF NOT EXISTS public.kv_order_update_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('order_confirmed','payment_received','shipped','delivered')),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','claimed','sent','held')),
  message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id,kind)
);
CREATE INDEX IF NOT EXISTS kv_order_update_events_pending ON public.kv_order_update_events(created_at) WHERE state='pending';
ALTER TABLE public.kv_order_update_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kv_order_update_events FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.kv_capture_order_update() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT NEW.order_updates_opt_in THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' AND NEW.payment_status='cod' THEN
    INSERT INTO public.kv_order_update_events(order_id,kind) VALUES(NEW.id,'order_confirmed') ON CONFLICT DO NOTHING;
  ELSIF TG_OP='UPDATE' THEN
    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status='paid' THEN
      INSERT INTO public.kv_order_update_events(order_id,kind) VALUES(NEW.id,'payment_received') ON CONFLICT DO NOTHING;
    END IF;
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status='shipped') OR (OLD.shipping_status IS DISTINCT FROM NEW.shipping_status AND NEW.shipping_status='shipped') THEN
      INSERT INTO public.kv_order_update_events(order_id,kind) VALUES(NEW.id,'shipped') ON CONFLICT DO NOTHING;
    END IF;
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status='delivered') OR (OLD.shipping_status IS DISTINCT FROM NEW.shipping_status AND NEW.shipping_status='delivered') THEN
      INSERT INTO public.kv_order_update_events(order_id,kind) VALUES(NEW.id,'delivered') ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS kv_order_update_capture ON public.orders;
CREATE TRIGGER kv_order_update_capture AFTER INSERT OR UPDATE OF payment_status,status,shipping_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.kv_capture_order_update();

CREATE OR REPLACE FUNCTION public.kv_claim_order_update(p_since TIMESTAMPTZ) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_event public.kv_order_update_events%ROWTYPE; v_order public.orders%ROWTYPE;
BEGIN
  IF auth.role()<>'service_role' OR p_since IS NULL THEN RAISE EXCEPTION 'service_role_required'; END IF;
  SELECT e.* INTO v_event FROM public.kv_order_update_events e JOIN public.orders o ON o.id=e.order_id
    WHERE e.state='pending' AND e.created_at>=p_since AND o.order_updates_opt_in
      AND o.status<>'cancelled' AND o.customer_phone ~ '^[0-9]{10}$'
    ORDER BY e.created_at FOR UPDATE OF e SKIP LOCKED LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.kv_order_update_events SET state='claimed' WHERE id=v_event.id;
  SELECT * INTO v_order FROM public.orders WHERE id=v_event.order_id;
  RETURN jsonb_build_object('id',v_event.id,'kind',v_event.kind,'phone','91'||v_order.customer_phone,
    'orderNumber',v_order.order_number,'trackingUrl',v_order.tracking_url);
END;
$$;
REVOKE ALL ON FUNCTION public.kv_claim_order_update(TIMESTAMPTZ) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kv_claim_order_update(TIMESTAMPTZ) TO service_role;
