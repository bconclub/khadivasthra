// Server-side backstop for payment recording.
//
// Until now `payment_status` was only ever set by a callback running in the
// shopper's browser after Razorpay succeeded. If they closed the tab, lost
// signal, or the call failed at that moment, Razorpay captured the money and
// this database never heard about it — the order stayed "pending" forever.
//
// Razorpay calls this endpoint directly, so capture is recorded regardless of
// what the browser does. Configure it in the Razorpay dashboard against the
// `payment.captured` event with the same secret as RAZORPAY_WEBHOOK_SECRET.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  // Reject anything not genuinely signed by Razorpay — this endpoint is public.
  if (!WEBHOOK_SECRET) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not set; refusing webhook");
    return new Response("not configured", { status: 500 });
  }
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
  if (expected !== signature) {
    console.warn("Rejected webhook with bad signature");
    return new Response("invalid signature", { status: 401 });
  }

  try {
    const event = JSON.parse(raw);
    if (event.event !== "payment.captured") {
      return new Response(JSON.stringify({ ignored: event.event }), { status: 200 });
    }

    const payment = event.payload?.payment?.entity;
    if (!payment) return new Response("no payment entity", { status: 400 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Payment's Razorpay order must equal the one stored on the merchant order.
    // Customer-controlled notes are never sufficient to choose an order.
    const query = supabase.from("orders").select("id,status,total,payment_status,reservation_expires_at")
      .eq("razorpay_order_id", payment.order_id).limit(1);
    const { data: rows } = await query;
    const order = rows?.[0];

    if (!order || payment.currency !== "INR" || payment.amount !== Math.round(Number(order.total) * 100)) {
      console.error("Webhook: no matching order for payment", payment.id, payment.order_id);
      return new Response(JSON.stringify({ matched: false }), { status: 200 });
    }

    if (order.payment_status === "paid") {
      await supabase.from("kv_assisted_carts").update({ purchased_at: new Date().toISOString() }).eq("order_id", order.id).is("purchased_at", null);
      return new Response(JSON.stringify({ matched: true }), { status: 200 });
    }
    if (order.payment_status !== "pending" || order.status === "cancelled" || !order.reservation_expires_at || Date.parse(order.reservation_expires_at) <= Date.now()) {
      const recorded = await supabase.from("kv_payment_exceptions").upsert({ order_id: order.id, razorpay_payment_id: payment.id, reason: "captured_after_reservation_closed" }, { onConflict: "razorpay_payment_id" });
      if (recorded.error) return new Response("exception logging failed", { status: 500 });
      return new Response(JSON.stringify({ matched: true, review_required: true }), { status: 200 });
    }
    const { data: updated, error } = await supabase
      .from("orders")
      .update({
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id,
        payment_status: "paid",
        status: order.status === "pending" ? "confirmed" : order.status,
      })
      .eq("id", order.id).eq("razorpay_order_id", payment.order_id).eq("payment_status", "pending").select("id");

    if (error) {
      console.error("Webhook: failed to update order", error.message);
      return new Response("update failed", { status: 500 });
    }
    if (!updated?.length) {
      const current = await supabase.from("orders").select("payment_status").eq("id", order.id).single();
      if (current.data?.payment_status !== "paid") {
        const recorded = await supabase.from("kv_payment_exceptions").upsert({ order_id: order.id, razorpay_payment_id: payment.id, reason: "captured_during_reservation_close" }, { onConflict: "razorpay_payment_id" });
        if (recorded.error) return new Response("exception logging failed", { status: 500 });
        return new Response(JSON.stringify({ matched: true, review_required: true }), { status: 200 });
      }
    }

    const assisted = await supabase.from("kv_assisted_carts").update({ purchased_at: new Date().toISOString() }).eq("order_id", order.id).is("purchased_at", null);
    if (assisted.error) return new Response("cart recovery suppression failed", { status: 500 });

    console.log("Webhook recorded payment", payment.id, "for order", order.id);
    return new Response(JSON.stringify({ matched: true }), { status: 200 });
  } catch (e) {
    console.error("Webhook error", e);
    return new Response("error", { status: 500 });
  }
});
