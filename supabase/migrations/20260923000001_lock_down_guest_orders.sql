-- Apply only after secure-checkout is deployed and browser checkout verified.
DROP POLICY IF EXISTS "Public read orders" ON public.orders;
DROP POLICY IF EXISTS "Public create orders" ON public.orders;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(UUID,INTEGER,UUID) FROM PUBLIC, anon, authenticated;

-- Authorized store admins retain their existing policies. Store customers use
-- the order-scoped secure-checkout status token instead of direct table reads.
