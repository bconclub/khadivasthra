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
    if (input.action === "order-status") {
      const sender = String(input.verifiedSender || "").replace(/\D/g, "");
      const phone = sender.startsWith("91") && sender.length === 12 ? sender.slice(2) : sender;
      const reference = String(input.orderNumber || "").trim().toUpperCase();
      if (!/^\d{10}$/.test(phone) || !/^KV-[A-Z0-9-]{8,32}$/.test(reference)) return respond({ error: "Order verification requires the WhatsApp number and order reference" }, 400);
      const found = await db.from("orders").select("order_number,status,payment_status,shipping_status,shipping_provider,courier_name,tracking_url,created_at")
        .eq("order_number", reference).eq("customer_phone", phone).maybeSingle();
      if (found.error) return respond({ error: "Order status unavailable" }, 503);
      if (!found.data) return respond({ error: "No order matched this WhatsApp number and reference. Ask staff for help." }, 404);
      return respond({ order: found.data });
    }
    if (input.action === "claim-order-update") {
      const since = String(input.since || "");
      if (!/^\d{4}-\d{2}-\d{2}T/.test(since) || !Number.isFinite(Date.parse(since))) return respond({ error: "Invalid activation time" }, 400);
      const claimed = await db.rpc("kv_claim_order_update", { p_since: since });
      return claimed.error ? respond({ error: "Order update queue unavailable" }, 503) : respond({ event: claimed.data });
    }
    if (input.action === "recheck-order-update") {
      if (!uuid(input.id)) return respond({ error: "Invalid event" }, 400);
      const event = await db.from("kv_order_update_events").select("order_id,kind,state").eq("id", input.id).single();
      if (event.error || event.data?.state !== "claimed") return respond({ eligible: false, reason: "event_unavailable" });
      const order = await db.from("orders").select("order_updates_opt_in,status,payment_status,shipping_status,customer_phone").eq("id", event.data.order_id).single();
      if (order.error) return respond({ eligible: false, reason: "order_unavailable" });
      const current = order.data;
      const confirmed = event.data.kind === "order_confirmed" ? current.payment_status === "cod"
        : event.data.kind === "payment_received" ? current.payment_status === "paid"
        : event.data.kind === "shipped" ? current.status === "shipped" || current.shipping_status === "shipped"
        : current.status === "delivered" || current.shipping_status === "delivered";
      return respond({ eligible: !!current.order_updates_opt_in && current.status !== "cancelled" && confirmed && /^\d{10}$/.test(String(current.customer_phone || "")) });
    }
    if (input.action === "ack-order-update") {
      if (!uuid(input.id) || !["sent", "held"].includes(input.status)) return respond({ error: "Invalid receipt" }, 400);
      const saved = await db.from("kv_order_update_events").update({ state: input.status, message_id: input.messageId || null }).eq("id", input.id).eq("state", "claimed").select("id");
      return saved.error || !saved.data?.length ? respond({ error: "Event receipt unavailable" }, 409) : respond({ ok: true });
    }
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
      const phone = /^91\d{10}$/.test(String(input.verifiedSender || "")) ? input.verifiedSender : null;
      const saved = await db.from("kv_assisted_carts").insert({ phone, items: items.map(item => ({ id: item.id, variant_id: item.variant_id || null, quantity: item.quantity })) }).select("id").single();
      if (saved.error) return respond({ error: "Cart unavailable" }, 503);
      return respond({ id: saved.data.id, url: `https://www.khadivasthra.com/cart/?cart=${saved.data.id}` });
    }
    if (input.action === "opt-out") {
      if (!/^91\d{10}$/.test(String(input.phone || ""))) return respond({ error: "Invalid customer" }, 400);
      const saved = await db.from("kv_assisted_carts").update({ marketing_opt_in: false }).eq("phone", input.phone);
      return saved.error ? respond({ error: "Could not save preference" }, 503) : respond({ ok: true });
    }
    if (input.action === "consent-latest") {
      const phone = String(input.phone || "");
      const messageId = String(input.messageId || "");
      if (!/^91\d{10}$/.test(phone) || !/^wamid\.[A-Za-z0-9._:-]{8,250}$/.test(messageId)) return respond({ error: "Invalid consent evidence" }, 400);
      const latest = await db.from("kv_assisted_carts").select("id,consent_message_id").eq("phone", phone).is("purchased_at", null)
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (latest.error || !latest.data) return respond({ error: "No recent cart for this WhatsApp number" }, 404);
      if (latest.data.consent_message_id) return respond({ ok: true, alreadyRecorded: true });
      const saved = await db.from("kv_assisted_carts").update({ marketing_opt_in: true, consent_message_id: messageId, consented_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", latest.data.id).is("consent_message_id", null).select("id");
      return saved.error || !saved.data?.length ? respond({ error: "Could not record consent" }, 503) : respond({ ok: true });
    }
    if (input.action === "opt-out-all") {
      const phone = String(input.phone || "");
      if (!/^91\d{10}$/.test(phone)) return respond({ error: "Invalid customer" }, 400);
      const [carts, orders] = await Promise.all([
        db.from("kv_assisted_carts").update({ marketing_opt_in: false }).eq("phone", phone),
        db.from("orders").update({ order_updates_opt_in: false }).eq("customer_phone", phone.slice(2)),
      ]);
      return carts.error || orders.error ? respond({ error: "Could not save all preferences" }, 503) : respond({ ok: true });
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
    if (input.action === "recheck") {
      if (!uuid(input.id) || !["2h", "24h"].includes(input.stage)) return respond({ error: "Invalid recovery claim" }, 400);
      const stateField = input.stage === "2h" ? "reminder_2h" : "reminder_24h";
      const found = await db.from("kv_assisted_carts").select("items,phone,marketing_opt_in,human_takeover,purchased_at,created_at,reminder_2h,reminder_24h").eq("id", input.id).single();
      if (found.error || !found.data || found.data[stateField] !== "claimed") return respond({ eligible: false, reason: "claim_unavailable" });
      const cart = found.data;
      const istHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
      if (!cart.marketing_opt_in || cart.human_takeover || cart.purchased_at || !cart.phone || istHour < 9 || istHour >= 20) return respond({ eligible: false, reason: "suppressed" });
      const latest = await db.from("kv_assisted_carts").select("id").eq("phone", cart.phone).is("purchased_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (latest.error || latest.data?.id !== input.id) return respond({ eligible: false, reason: "newer_cart" });
      const buyerPhone = String(cart.phone).slice(-10);
      const orders = await db.from("orders").select("id").eq("customer_phone", buyerPhone).gte("created_at", cart.created_at).in("payment_status", ["paid", "cod"]).limit(1);
      if (orders.error) return respond({ eligible: false, reason: "order_check_unavailable" });
      if (orders.data?.length) return respond({ eligible: false, reason: "purchased" });
      const requested = new Map<string, number>();
      for (const line of cart.items as { id: string; variant_id?: string | null; quantity: number }[]) {
        const lineKey = `${line.id}:${line.variant_id || ""}`;
        requested.set(lineKey, (requested.get(lineKey) || 0) + line.quantity);
        const product = await db.from("products").select("is_active,is_wholesale,in_stock,stock_quantity,has_variants").eq("id", line.id).single();
        if (product.error || !product.data?.is_active || product.data.is_wholesale || !product.data.in_stock) return respond({ eligible: false, reason: "product_unavailable" });
        if (line.variant_id) {
          const variant = await db.from("product_variants").select("is_active,stock_quantity,product_id").eq("id", line.variant_id).single();
          if (variant.error || !variant.data?.is_active || variant.data.product_id !== line.id || Number(variant.data.stock_quantity) < requested.get(lineKey)!) return respond({ eligible: false, reason: "variant_unavailable" });
        } else if (product.data.has_variants || Number(product.data.stock_quantity) < requested.get(lineKey)!) return respond({ eligible: false, reason: "stock_unavailable" });
      }
      return respond({ eligible: true });
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
