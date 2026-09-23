import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-proxe-commerce-token", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Content-Type": "application/json" };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const uuid = (value: unknown) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

serve(async (request) => {
  if (request.method === "OPTIONS") return respond({ ok: true });
  const url = new URL(request.url);
  if (request.method === "GET") {
    const id = url.searchParams.get("id");
    if (!uuid(id)) return respond({ error: "Invalid cart link" }, 400);
    const found = await db.from("kv_assisted_carts").select("items,updated_at,purchased_at").eq("id", id).single();
    if (found.error || !found.data || found.data.purchased_at) return respond({ error: "Cart unavailable" }, 404);
    return respond({ items: found.data.items, updatedAt: found.data.updated_at });
  }
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("KV_PROXE_SHARED_SECRET");
  if (!secret || secret.length < 32 || request.headers.get("x-proxe-commerce-token") !== secret) return respond({ error: "Forbidden" }, 403);
  try {
    const input = await request.json();
    if (input.action === "prepare") {
      const items = input.items;
      if (!Array.isArray(items) || !items.length || items.length > 20 || items.some(item => !uuid(item.id) || (item.variant_id && !uuid(item.variant_id)) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) return respond({ error: "Invalid cart" }, 400);
      const productIds = [...new Set(items.map(item => item.id))];
      const productResult = await db.from("products").select("id,is_active,is_wholesale,in_stock,has_variants,stock_quantity").in("id", productIds);
      if (productResult.error || productResult.data?.length !== productIds.length) return respond({ error: "Product unavailable" }, 409);
      const productMap = new Map(productResult.data.map(item => [item.id, item]));
      const variantIds = [...new Set(items.map(item => item.variant_id).filter(Boolean))];
      const variantResult = variantIds.length ? await db.from("product_variants").select("id,product_id,is_active,stock_quantity").in("id", variantIds) : { data: [], error: null };
      if (variantResult.error || variantResult.data?.length !== variantIds.length) return respond({ error: "Variant unavailable" }, 409);
      const variantMap = new Map((variantResult.data || []).map(item => [item.id, item]));
      const requested = new Map<string, number>();
      for (const item of items) {
        const product = productMap.get(item.id);
        const variant = item.variant_id ? variantMap.get(item.variant_id) : null;
        if (!product?.is_active || product.is_wholesale || !product.in_stock || (product.has_variants && (!variant?.is_active || variant.product_id !== item.id)) || (!product.has_variants && item.variant_id)) return respond({ error: "Product or variant unavailable" }, 409);
        const key = `${item.id}:${item.variant_id || ""}`;
        requested.set(key, (requested.get(key) || 0) + item.quantity);
        if (requested.get(key)! > Number(variant?.stock_quantity ?? product.stock_quantity)) return respond({ error: "Selected quantity is out of stock" }, 409);
      }
      const saved = await db.from("kv_assisted_carts").insert({ items: items.map(item => ({ id: item.id, variant_id: item.variant_id || null, quantity: item.quantity })) }).select("id").single();
      if (saved.error) return respond({ error: "Cart unavailable" }, 503);
      return respond({ id: saved.data.id, url: `https://www.khadivasthra.com/cart/?cart=${saved.data.id}` });
    }
    if (input.action === "consent") {
      if (!uuid(input.id) || !/^91\d{10}$/.test(String(input.phone || ""))) return respond({ error: "Invalid customer" }, 400);
      const saved = await db.from("kv_assisted_carts").update({ phone: input.phone, marketing_opt_in: input.optedIn === true, updated_at: new Date().toISOString() }).eq("id", input.id).is("purchased_at", null).select("id");
      return saved.error || !saved.data?.length ? respond({ error: "Cart unavailable" }, 404) : respond({ ok: true });
    }
    if (input.action === "opt-out") {
      if (!/^91\d{10}$/.test(String(input.phone || ""))) return respond({ error: "Invalid customer" }, 400);
      const saved = await db.from("kv_assisted_carts").update({ marketing_opt_in: false }).eq("phone", input.phone);
      return saved.error ? respond({ error: "Could not save preference" }, 503) : respond({ ok: true });
    }
    if (input.action === "takeover") {
      if (!/^91\d{10}$/.test(String(input.phone || ""))) return respond({ error: "Invalid customer" }, 400);
      const saved = await db.from("kv_assisted_carts").update({ human_takeover: input.active !== false }).eq("phone", input.phone).is("purchased_at", null);
      return saved.error ? respond({ error: "Could not pause recovery" }, 503) : respond({ ok: true });
    }
    if (input.action === "claim") {
      const stage = input.stage === "24h" ? "24h" : "2h";
      const claimed = await db.rpc("kv_claim_recovery", { p_stage: stage });
      return claimed.error ? respond({ error: "Recovery queue unavailable" }, 503) : respond({ cart: claimed.data });
    }
    if (input.action === "ack") {
      if (!uuid(input.id) || !["2h","24h"].includes(input.stage) || !["sent","held"].includes(input.status)) return respond({ error: "Invalid receipt" }, 400);
      const field = input.stage === "2h" ? "reminder_2h" : "reminder_24h";
      const saved = await db.from("kv_assisted_carts").update({ [field]: input.status, [`${field}_message_id`]: input.messageId || null }).eq("id", input.id).eq(field, "claimed").select("id");
      return saved.error || !saved.data?.length ? respond({ error: "Claim unavailable" }, 409) : respond({ ok: true });
    }
    return respond({ error: "Invalid action" }, 400);
  } catch { return respond({ error: "Invalid request" }, 400); }
});
