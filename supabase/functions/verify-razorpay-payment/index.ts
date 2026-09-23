import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function verifySignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id,
    } = await req.json();

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !order_id
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify HMAC SHA256: sign "razorpay_order_id|razorpay_payment_id" with secret
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const isValid = await verifySignature(
      payload,
      razorpay_signature,
      RAZORPAY_KEY_SECRET
    );

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (isValid) {
      const { data: order, error: orderError } = await supabase.from("orders")
        .select("razorpay_order_id,total,payment_method,payment_status,reservation_expires_at")
        .eq("id", order_id).single();
      if (orderError || !order || order.payment_method !== "online" || order.razorpay_order_id !== razorpay_order_id) {
        return new Response(JSON.stringify({ verified: false, error: "Payment does not belong to this order" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
        headers: { Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}` },
      });
      if (!paymentRes.ok) return new Response(JSON.stringify({ error: "Could not confirm payment" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const payment = await paymentRes.json();
      if (payment.order_id !== razorpay_order_id || payment.currency !== "INR" || payment.amount !== Math.round(Number(order.total) * 100) || payment.status !== "captured") {
        return new Response(JSON.stringify({ verified: false, error: "Payment is not captured for this order" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (order.payment_status === "paid") {
        await supabase.from("kv_assisted_carts").update({ purchased_at: new Date().toISOString() }).eq("order_id", order_id).is("purchased_at", null);
        return new Response(JSON.stringify({ verified: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (order.payment_status !== "pending" || !order.reservation_expires_at || Date.parse(order.reservation_expires_at) <= Date.now()) {
        const exception = await supabase.from("kv_payment_exceptions").upsert({ order_id, razorpay_payment_id, reason: "captured_after_reservation_closed" }, { onConflict: "razorpay_payment_id" });
        if (exception.error) return new Response(JSON.stringify({ error: "Payment needs staff review; exception recording failed" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "Payment captured after reservation closed. Staff will review it." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: updated, error: updateError } = await supabase
        .from("orders")
        .update({
          razorpay_payment_id,
          razorpay_signature,
          payment_status: "paid",
          status: "confirmed",
        })
        .eq("id", order_id).eq("razorpay_order_id", razorpay_order_id).eq("payment_status", "pending").select("id");

      if (updateError) {
        console.error("Supabase update error:", updateError);
        return new Response(
          JSON.stringify({
            error: "Payment verified but failed to update order",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (!updated?.length) {
        await supabase.from("kv_payment_exceptions").upsert({ order_id, razorpay_payment_id, reason: "captured_during_reservation_close" }, { onConflict: "razorpay_payment_id" });
        return new Response(JSON.stringify({ error: "Order is no longer payable. Staff will review the captured payment." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const assisted = await supabase.from("kv_assisted_carts").update({ purchased_at: new Date().toISOString() }).eq("order_id", order_id).is("purchased_at", null);
      if (assisted.error) console.error("Could not suppress assisted cart recovery", assisted.error);

      // Auto-create Shiprocket shipment (non-blocking — don't fail payment if this errors)
      try {
        const shiprocketUrl = `${SUPABASE_URL}/functions/v1/shiprocket-create-order`;
        console.log("Auto-creating Shiprocket order for:", order_id);
        const shipRes = await fetch(shiprocketUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({ order_id }),
        });
        if (!shipRes.ok) {
          const errText = await shipRes.text();
          console.error("Shiprocket auto-create failed:", shipRes.status, errText);
        } else {
          const shipData = await shipRes.json();
          console.log("Shiprocket auto-create success:", JSON.stringify(shipData));
        }
      } catch (shipErr) {
        console.error("Shiprocket auto-create error:", shipErr);
      }

      return new Response(JSON.stringify({ verified: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(
        JSON.stringify({
          verified: false,
          error: "Payment verification failed",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
