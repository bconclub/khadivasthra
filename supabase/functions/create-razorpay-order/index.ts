import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyOrderToken } from "../_shared/order-token.ts";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_id, status_token } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: order, error: orderError } = await supabase.from("orders")
      .select("id,customer_phone,total,payment_status,payment_method,razorpay_order_id,reservation_expires_at")
      .eq("id", order_id).single();
    if (orderError || !order || !await verifyOrderToken(order.id, order.customer_phone, status_token)) {
      return new Response(JSON.stringify({ error: "Order link is invalid" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (order.payment_method !== "online" || order.payment_status !== "pending" || !order.reservation_expires_at || Date.parse(order.reservation_expires_at) <= Date.now()) {
      return new Response(JSON.stringify({ error: "Order is not payable" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const amountInPaise = Math.round(Number(order.total) * 100);
    if (!Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
      return new Response(JSON.stringify({ error: "Invalid stored order amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.razorpay_order_id) {
      const existing = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(order.razorpay_order_id)}`, {
        headers: { Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}` },
      });
      if (!existing.ok) return new Response(JSON.stringify({ error: "Could not verify existing payment order" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const saved = await existing.json();
      if (saved.amount !== amountInPaise || saved.currency !== "INR") return new Response(JSON.stringify({ error: "Payment amount mismatch" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ razorpay_order_id: saved.id, amount: saved.amount, currency: saved.currency }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: order_id,
        notes: { order_id },
      }),
    });

    if (!razorpayRes.ok) {
      const errBody = await razorpayRes.text();
      console.error("Razorpay API error:", errBody);
      return new Response(
        JSON.stringify({ error: "Failed to create payment order" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const razorpayOrder = await razorpayRes.json();

    // Store razorpay_order_id on the Supabase order row
    const { data: savedRows, error: updateError } = await supabase
      .from("orders")
      .update({ razorpay_order_id: razorpayOrder.id })
      .eq("id", order_id).is("razorpay_order_id", null).select("id");

    if (updateError || !savedRows?.length) {
      console.error("Supabase update error:", updateError);
      return new Response(JSON.stringify({ error: "Could not save payment order" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({
        razorpay_order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
