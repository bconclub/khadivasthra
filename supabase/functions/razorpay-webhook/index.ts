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

    // Match on the Razorpay order id we stored, else on `notes.order_id`
    // (retries create a new Razorpay order, so the stored id can be stale).
    let query = supabase.from("orders").select("id, status").limit(1);
    if (payment.notes?.order_id) {
      query = query.eq("id", payment.notes.order_id);
    } else {
      query = query.eq("razorpay_order_id", payment.order_id);
    }
    const { data: rows } = await query;
    const order = rows?.[0];

    if (!order) {
      console.error("Webhook: no matching order for payment", payment.id, payment.order_id);
      return new Response(JSON.stringify({ matched: false }), { status: 200 });
    }

    const { error } = await supabase
      .from("orders")
      .update({
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id,
        payment_status: "paid",
        status: order.status === "pending" ? "confirmed" : order.status,
      })
      .eq("id", order.id);

    if (error) {
      console.error("Webhook: failed to update order", error.message);
      return new Response("update failed", { status: 500 });
    }

    console.log("Webhook recorded payment", payment.id, "for order", order.id);
    return new Response(JSON.stringify({ matched: true }), { status: 200 });
  } catch (e) {
    console.error("Webhook error", e);
    return new Response("error", { status: 500 });
  }
});
