// Starts an Easebuzz hosted-checkout payment for an existing online order and
// returns the URL to send the shopper to. The amount always comes from the
// order row, never from the browser.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json } from "../_shared/shipway.ts";
import { relayFetch } from "../_shared/relay.ts";
import {
  adminClient, clean, EASEBUZZ_KEY, formatAmount, isConfigured, PAY_BASE, requestHash,
} from "../_shared/easebuzz.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!isConfigured()) return json({ error: "Easebuzz is not configured" }, 500);

    const { order_id } = await req.json();
    if (!order_id) return json({ error: "order_id is required" }, 400);

    const supabase = adminClient();

    const { data: settings } = await supabase.from("settings").select("payment_gateway, store_email").limit(1).single();
    if (settings?.payment_gateway !== "easebuzz") {
      return json({ error: "Easebuzz payments are not switched on" }, 409);
    }

    const { data: order, error } = await supabase.from("orders").select("*").eq("id", order_id).single();
    if (error || !order) return json({ error: "Order not found" }, 404);
    if (order.payment_method !== "online") return json({ error: "Order is not an online payment" }, 400);
    if (order.payment_status === "paid") return json({ error: "Order is already paid" }, 409);

    // Each attempt needs a fresh txnid (Easebuzz rejects duplicates), so a
    // retry after a failed or abandoned attempt gets a new suffix.
    const txnid = `${order.order_number}-${Date.now().toString(36)}`.slice(0, 40);
    const callback = `${SUPABASE_URL}/functions/v1/easebuzz-callback`;
    const email = clean(order.customer_email, /[^a-zA-Z0-9@._+\-]/g, 200) || settings?.store_email || "";
    if (!email) return json({ error: "An email address is required for online payment" }, 400);

    const params: Record<string, string> = {
      key: EASEBUZZ_KEY,
      txnid,
      amount: formatAmount(order.total),
      productinfo: clean(`Order ${order.order_number}`, /[^a-zA-Z0-9\s|\-]/g, 45),
      firstname: clean(order.customer_name, /[^a-zA-Z0-9&\-._ ()/,@]/g, 150) || "Customer",
      phone: clean(order.customer_phone, /[^0-9]/g, 20),
      email,
      surl: callback,
      furl: callback,
      udf1: order.id,
    };
    const city = clean(order.customer_city, /[^0-9a-zA-Z_.\s-]/g, 50);
    const state = clean(order.customer_state, /[^0-9a-zA-Z_.\s-]/g, 50);
    const zipcode = clean(order.customer_pincode, /[^0-9]/g, 6);
    if (city) params.city = city;
    if (state) params.state = state;
    if (zipcode) params.zipcode = zipcode;
    params.country = "India";
    params.hash = await requestHash(params);

    const res = await relayFetch(`${PAY_BASE}/payment/initiateLink`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(params).toString(),
    });
    const body = await res.json().catch(() => null);

    if (!res.ok || body?.status !== 1 || !body?.data) {
      console.error("Easebuzz initiate failed:", res.status, JSON.stringify(body));
      return json({ error: "Could not start the payment. Please try again." }, 502);
    }

    await supabase
      .from("orders")
      .update({ payment_gateway: "easebuzz", gateway_txn_id: txnid })
      .eq("id", order.id);

    return json({ checkout_url: `${PAY_BASE}/pay/${body.data}`, txnid });
  } catch (err) {
    console.error("easebuzz-initiate error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
