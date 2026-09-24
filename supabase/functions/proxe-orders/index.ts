import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

function matchesSecret(value: string | null, expected: string | undefined): boolean {
  if (!expected || expected.length < 32 || !value) return false;
  let mismatch = value.length ^ expected.length;
  for (let index = 0; index < Math.max(value.length, expected.length); index++) {
    mismatch |= (value.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!matchesSecret(request.headers.get("x-proxe-commerce-token"), Deno.env.get("KV_PROXE_SHARED_SECRET"))) {
    return json({ error: "Forbidden" }, 403);
  }

  let page: number;
  try {
    const body = await request.json();
    page = body.page ?? 0;
    if (!Number.isInteger(page) || page < 0 || page > 1000) return json({ error: "Invalid page" }, 400);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const pageSize = 25;
  const { data, count, error } = await db.from("orders")
    .select("order_number,created_at,customer_name,items,total,status,payment_status,payment_method,shipping_status,shipping_provider", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) return json({ error: "Orders unavailable" }, 503);
  return json({ orders: data || [], total: count ?? 0, page, pageSize });
});
