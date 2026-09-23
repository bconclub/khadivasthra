import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { issueOrderToken, verifyOrderToken } from "../_shared/order-token.ts";

const base = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(base, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

async function quote(cart: Array<{ id: string; variant_id?: string; quantity: number; combo?: { combo_id: string; combo_line: string } }>, pincode: string, cod: boolean) {
  if (!Array.isArray(cart) || !cart.length || cart.length > 50 || !/^\d{6}$/.test(pincode)) throw new Error("Invalid cart or pincode");
  const ids = [...new Set(cart.map(item => item.id))];
  const products = await db.from("products").select("id,price,is_active,is_wholesale,stock_quantity,has_variants").in("id", ids);
  if (products.error || products.data?.length !== ids.length) throw new Error("Product unavailable");
  const byId = new Map(products.data.map(item => [item.id, item]));
  const variantIds = [...new Set(cart.map(item => item.variant_id).filter((id): id is string => !!id))];
  const variants = variantIds.length ? await db.from("product_variants").select("id,product_id,price_adjustment,stock_quantity,is_active").in("id", variantIds) : { data: [], error: null };
  if (variants.error) throw new Error("Variant unavailable");
  const byVariant = new Map((variants.data || []).map(item => [item.id, item]));
  const comboIds = [...new Set(cart.map(item => item.combo?.combo_id).filter((id): id is string => !!id))];
  const combos = comboIds.length ? await db.from("combos").select("id,combo_price,choose_count,is_active,allow_duplicates").in("id", comboIds) : { data: [], error: null };
  if (combos.error) throw new Error("Combo unavailable");
  const byCombo = new Map((combos.data || []).map(item => [item.id, item]));
  const groups = new Map<string, typeof cart>();
  let subtotal = 0, count = 0;
  for (const item of cart) {
    const product = byId.get(item.id);
    const variant = item.variant_id ? byVariant.get(item.variant_id) : null;
    if (!product?.is_active || product.is_wholesale || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 || (product.has_variants && (!variant?.is_active || variant.product_id !== item.id)) || (!product.has_variants && item.variant_id)) throw new Error("Product or variant unavailable");
    if (item.quantity > Number(variant?.stock_quantity ?? product.stock_quantity)) throw new Error("Selected quantity is out of stock");
    count += item.quantity;
    if (item.combo) {
      const lines = groups.get(item.combo.combo_line) || [];
      lines.push(item); groups.set(item.combo.combo_line, lines);
    } else subtotal += (Number(product.price) + Number(variant?.price_adjustment || 0)) * item.quantity;
  }
  if (count > 99) throw new Error("Too many items");
  for (const lines of groups.values()) {
    const combo = byCombo.get(lines[0].combo!.combo_id);
    if (!combo?.is_active || lines.length !== combo.choose_count || lines.some(item => item.combo?.combo_id !== combo.id || item.quantity !== lines[0].quantity)) throw new Error("Combo changed");
    const membership = await db.from("combo_products").select("product_id").eq("combo_id", combo.id);
    if (membership.error || lines.some(item => !membership.data?.some(row => row.product_id === item.id)) || (!combo.allow_duplicates && new Set(lines.map(item => item.id)).size !== lines.length)) throw new Error("Combo unavailable");
    subtotal += Number(combo.combo_price) * lines[0].quantity;
  }
  const rates = await fetch(`${base}/functions/v1/shiprocket-check-serviceability`, { method: "POST", headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json" }, body: JSON.stringify({ delivery_pincode: pincode, total_items: count }) });
  const serviceability = rates.ok ? await rates.json() : null;
  if (!serviceability?.available || (cod && !serviceability.cod_available)) throw new Error("Delivery is unavailable for this pincode and payment method");
  const settings = await db.from("settings").select("shipping_tiers,cod_enabled,is_store_open").limit(1).single();
  if (settings.error || !settings.data?.is_store_open || (cod && !settings.data.cod_enabled)) throw new Error("Store or payment method is unavailable");
  const tiers = Array.isArray(settings.data.shipping_tiers) ? settings.data.shipping_tiers.sort((a: { max_items: number }, b: { max_items: number }) => a.max_items - b.max_items) : [];
  const tier = tiers.find((item: { max_items: number }) => count <= item.max_items) || tiers.at(-1);
  const shipping = Number(tier?.rate ?? (cod ? serviceability.cod_cheapest_rate : serviceability.cheapest_rate));
  if (!Number.isFinite(shipping) || shipping < 0) throw new Error("Shipping rate unavailable");
  const codCharges = cod ? Math.round((subtotal + shipping) * 0.016) : 0;
  if (cod && subtotal < 1000) throw new Error("Cash on Delivery requires a minimum of ₹1000");
  return { subtotal, shipping, codCharges, total: subtotal + shipping + codCharges };
}

serve(async (request) => {
  if (request.method === "OPTIONS") return respond({ ok: true });
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  try {
    const input = await request.json();
    if (input.action === "status") {
      if (!/^[0-9a-f-]{36}$/i.test(input.id || "") || typeof input.token !== "string") return respond({ error: "Invalid order link" }, 400);
      const result = await db.from("orders").select("id,order_number,customer_phone,status,payment_status,shipping_status,shipping_provider,courier_name,tracking_url,created_at").eq("id", input.id).single();
      if (result.error || !result.data || !await verifyOrderToken(result.data.id, result.data.customer_phone, input.token)) return respond({ error: "Order not found" }, 404);
      const { customer_phone: _phone, ...safeOrder } = result.data;
      return respond({ order: safeOrder });
    }
    if (input.action !== "quote" && input.action !== "create") return respond({ error: "Invalid action" }, 400);
    const { customer, cart } = input;
    if (!customer || !/^\d{10}$/.test(String(customer.phone || "")) || !/^\d{6}$/.test(String(customer.pincode || "")) || ["name","address","city","state"].some(key => !String(customer[key] || "").trim() || String(customer[key]).length > 240)) return respond({ error: "Check customer details" }, 400);
    const cod = input.paymentMethod === "cod";
    if (!cod && input.paymentMethod !== "online") return respond({ error: "Invalid payment method" }, 400);
    const current = await quote(cart, String(customer.pincode), cod);
    if (input.action === "quote") return respond({ quote: current });
    if (!/^[0-9a-f-]{36}$/i.test(input.key || "")) return respond({ error: "Invalid checkout key" }, 400);
    if (Math.abs(Number(input.expectedTotal) - current.total) > 0.009) return respond({ error: "Cart total changed. Review the current price and delivery charge.", quote: current }, 409);
    const saved = await db.rpc("kv_place_order", { p_key: input.key, p_customer: customer, p_cart: cart, p_shipping: current.shipping, p_cod: cod, p_expected: current.total });
    if (saved.error) return respond({ error: saved.error.message.includes("checkout_total_changed") ? "Cart total changed. Review before paying." : "Order could not be placed. Check stock and try again." }, 409);
    const ownership = await db.from("orders").select("customer_phone").eq("id", saved.data.id).single();
    if (ownership.error || ownership.data?.customer_phone !== customer.phone) return respond({ error: "Checkout key belongs to another order" }, 409);
    if (/^[0-9a-f-]{36}$/i.test(input.assistedCartId || "")) {
      const assisted = await db.from("kv_assisted_carts").select("items,order_id").eq("id", input.assistedCartId).single();
      const normalize = (lines: Array<{ id: string; variant_id?: string | null; quantity: number }>) =>
        lines.map(line => `${line.id}:${line.variant_id || ""}:${line.quantity}`).sort().join("|");
      if (assisted.data && !assisted.data.order_id && normalize(assisted.data.items) === normalize(cart)) {
        const linked = await db.from("kv_assisted_carts").update({ order_id: saved.data.id, ...(cod ? { purchased_at: new Date().toISOString() } : {}) }).eq("id", input.assistedCartId).is("order_id", null);
        if (linked.error) console.error("assisted cart link", linked.error);
      }
    }
    return respond({ order: saved.data, statusToken: await issueOrderToken(saved.data.id, ownership.data.customer_phone) });
  } catch (error) {
    console.error("secure-checkout", error);
    return respond({ error: error instanceof Error ? error.message : "Checkout unavailable" }, 503);
  }
});
