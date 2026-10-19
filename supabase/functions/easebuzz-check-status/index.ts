// Asks Easebuzz (Transaction API v2.1) for the latest attempt on an order and
// records the result. Used by the admin "check payment" buttons for orders
// paid through Easebuzz; Razorpay orders keep using check-payment-status.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json } from "../_shared/shipway.ts";
import {
  adminClient, applyTransaction, DASHBOARD_BASE, EASEBUZZ_KEY, EASEBUZZ_SALT, isConfigured, sha512, verifyResponseHash,
} from "../_shared/easebuzz.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!isConfigured()) return json({ error: "Easebuzz is not configured" }, 500);

    const { order_id } = await req.json();
    if (!order_id) return json({ error: "order_id is required" }, 400);

    const supabase = adminClient();
    const { data: order } = await supabase
      .from("orders")
      .select("id, payment_status, gateway_txn_id, gateway_payment_id")
      .eq("id", order_id)
      .single();
    if (!order) return json({ error: "Order not found" }, 404);

    if (order.payment_status === "paid") {
      return json({ payment_status: "paid", reconciled: false, message: "Payment already confirmed", gateway_payment_id: order.gateway_payment_id });
    }
    if (!order.gateway_txn_id) {
      return json({ payment_status: order.payment_status, reconciled: false, message: "No Easebuzz payment was started for this order" });
    }

    const txnid = order.gateway_txn_id;
    const res = await fetch(`${DASHBOARD_BASE}/transaction/v2.1/retrieve`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ key: EASEBUZZ_KEY, txnid, hash: await sha512(`${EASEBUZZ_KEY}|${txnid}|${EASEBUZZ_SALT}`) }).toString(),
    });
    const body = await res.json().catch(() => null);
    const txnRaw = Array.isArray(body?.msg) ? body.msg[0] : null;
    if (!res.ok || !body?.status || !txnRaw) {
      console.error("Easebuzz status lookup failed:", res.status, JSON.stringify(body));
      return json({ payment_status: order.payment_status, reconciled: false, message: "Easebuzz has no record of this payment yet" });
    }

    const txn: Record<string, string> = {};
    for (const [k, v] of Object.entries(txnRaw)) txn[k] = v == null ? "" : String(v);
    if (!(await verifyResponseHash(txn))) {
      return json({ error: "Easebuzz response failed hash verification" }, 502);
    }

    const { outcome } = await applyTransaction(supabase, txn);
    return json({
      payment_status: outcome === "paid" ? "paid" : outcome === "failed" ? "failed" : order.payment_status,
      reconciled: outcome === "paid",
      message: outcome === "paid" ? `Easebuzz payment ${txn.easepayid} recorded` : `Easebuzz status: ${txn.status}`,
      gateway_payment_id: txn.easepayid,
    });
  } catch (err) {
    console.error("easebuzz-check-status error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
