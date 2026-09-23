-- Apply after secure checkout and before enabling order-update templates.
CREATE TABLE IF NOT EXISTS public.kv_order_update_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('order_confirmed','payment_received','shipped','delivered')),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','claimed','sent','held')),
  message_id TEXT,
  delivery_status TEXT CHECK (delivery_status IN ('sent','failed','delivered','read')),
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

-- Meta can report delivery before the send acknowledgement stores its message ID.
CREATE TABLE IF NOT EXISTS public.kv_commerce_receipts (
  message_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('sent','failed','delivered','read')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kv_commerce_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kv_commerce_receipts FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.kv_record_commerce_receipt(p_message_id TEXT, p_status TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_rank INTEGER; v_count INTEGER := 0; v_changed INTEGER; v_status TEXT;
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service_role_required'; END IF;
  IF p_message_id IS NULL OR length(p_message_id)>300 OR (p_status IS NOT NULL AND p_status NOT IN ('sent','failed','delivered','read')) THEN RAISE EXCEPTION 'invalid_receipt'; END IF;
  IF p_status IS NOT NULL THEN
    INSERT INTO public.kv_commerce_receipts(message_id,status) VALUES(p_message_id,p_status)
      ON CONFLICT (message_id) DO UPDATE SET status=CASE
        WHEN (CASE EXCLUDED.status WHEN 'sent' THEN 1 WHEN 'failed' THEN 2 WHEN 'delivered' THEN 3 ELSE 4 END)
           > (CASE kv_commerce_receipts.status WHEN 'sent' THEN 1 WHEN 'failed' THEN 2 WHEN 'delivered' THEN 3 ELSE 4 END)
        THEN EXCLUDED.status ELSE kv_commerce_receipts.status END, updated_at=now();
  END IF;
  SELECT status INTO v_status FROM public.kv_commerce_receipts WHERE message_id=p_message_id;
  IF v_status IS NULL THEN RETURN false; END IF;
  v_rank := CASE v_status WHEN 'sent' THEN 1 WHEN 'failed' THEN 2 WHEN 'delivered' THEN 3 ELSE 4 END;
  UPDATE public.kv_order_update_events SET delivery_status=v_status
    WHERE message_id=p_message_id AND state='sent'
      AND (delivery_status IS NULL OR (CASE delivery_status WHEN 'sent' THEN 1 WHEN 'failed' THEN 2 WHEN 'delivered' THEN 3 ELSE 4 END)<v_rank);
  GET DIAGNOSTICS v_changed = ROW_COUNT; v_count := v_count+v_changed;
  UPDATE public.kv_assisted_carts SET reminder_2h_delivery=v_status
    WHERE reminder_2h_message_id=p_message_id AND reminder_2h='sent'
      AND (reminder_2h_delivery IS NULL OR (CASE reminder_2h_delivery WHEN 'sent' THEN 1 WHEN 'failed' THEN 2 WHEN 'delivered' THEN 3 ELSE 4 END)<v_rank);
  GET DIAGNOSTICS v_changed = ROW_COUNT; v_count := v_count+v_changed;
  UPDATE public.kv_assisted_carts SET reminder_24h_delivery=v_status
    WHERE reminder_24h_message_id=p_message_id AND reminder_24h='sent'
      AND (reminder_24h_delivery IS NULL OR (CASE reminder_24h_delivery WHEN 'sent' THEN 1 WHEN 'failed' THEN 2 WHEN 'delivered' THEN 3 ELSE 4 END)<v_rank);
  GET DIAGNOSTICS v_changed = ROW_COUNT; v_count := v_count+v_changed;
  RETURN v_count>0;
END;
$$;
REVOKE ALL ON FUNCTION public.kv_record_commerce_receipt(TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kv_record_commerce_receipt(TEXT,TEXT) TO service_role;
