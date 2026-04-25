import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const RAZORPAY_BASE = "https://api.razorpay.com/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the order from our DB
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (fetchError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already paid, just return current status
    if (order.payment_status === "paid") {
      return new Response(
        JSON.stringify({
          payment_status: "paid",
          message: "Payment already confirmed",
          razorpay_payment_id: order.razorpay_payment_id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    let razorpayOrderId: string | null = order.razorpay_order_id;

    // If no razorpay_order_id stored, search Razorpay by receipt (our internal order_id)
    if (!razorpayOrderId) {
      const lookupRes = await fetch(
        `${RAZORPAY_BASE}/orders?receipt=${encodeURIComponent(order_id)}`,
        { headers: { Authorization: `Basic ${authHeader}` } }
      );

      if (!lookupRes.ok) {
        const errText = await lookupRes.text();
        console.error("Razorpay order lookup error:", lookupRes.status, errText);
        return new Response(
          JSON.stringify({ error: "Failed to look up order on Razorpay", details: errText }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const lookupData = await lookupRes.json();
      const razorpayOrders = lookupData.items || [];

      if (razorpayOrders.length === 0) {
        return new Response(
          JSON.stringify({
            payment_status: "no_razorpay_order",
            reconciled: false,
            message: "No Razorpay order found for this order — customer likely never started payment",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use the most recent matching Razorpay order
      razorpayOrderId = razorpayOrders[0].id as string;

      // Backfill it onto our order so future checks are direct
      await supabase
        .from("orders")
        .update({ razorpay_order_id: razorpayOrderId })
        .eq("id", order_id);
    }

    // Query Razorpay API for payments on this order
    const paymentsRes = await fetch(
      `${RAZORPAY_BASE}/orders/${razorpayOrderId}/payments`,
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
        },
      }
    );

    if (!paymentsRes.ok) {
      const errText = await paymentsRes.text();
      console.error("Razorpay API error:", paymentsRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch payment status from Razorpay", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentsData = await paymentsRes.json();
    const payments = paymentsData.items || [];

    console.log("Razorpay payments for order:", razorpayOrderId, JSON.stringify(payments.map((p: { id: string; status: string; amount: number }) => ({ id: p.id, status: p.status, amount: p.amount }))));

    // Find a captured (successful) payment
    const capturedPayment = payments.find((p: { status: string }) => p.status === "captured");

    if (capturedPayment) {
      // Payment was successful — update our order
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          razorpay_payment_id: capturedPayment.id,
          payment_status: "paid",
          status: order.status === "pending" ? "confirmed" : order.status,
        })
        .eq("id", order_id);

      if (updateError) {
        console.error("Failed to update order:", updateError);
        return new Response(
          JSON.stringify({ error: "Payment found but failed to update order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Also try to create Shiprocket order
      try {
        const shipRes = await fetch(`${SUPABASE_URL}/functions/v1/shiprocket-create-order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({ order_id }),
        });
        if (!shipRes.ok) {
          console.error("Shiprocket auto-create failed:", await shipRes.text());
        }
      } catch (shipErr) {
        console.error("Shiprocket auto-create error:", shipErr);
      }

      return new Response(
        JSON.stringify({
          payment_status: "paid",
          reconciled: true,
          razorpay_payment_id: capturedPayment.id,
          amount: capturedPayment.amount / 100, // Razorpay stores in paise
          message: "Payment found and order updated",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for authorized but not captured
    const authorizedPayment = payments.find((p: { status: string }) => p.status === "authorized");
    if (authorizedPayment) {
      return new Response(
        JSON.stringify({
          payment_status: "authorized",
          reconciled: false,
          razorpay_payment_id: authorizedPayment.id,
          message: "Payment authorized but not yet captured. Please capture from Razorpay dashboard.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No successful payment found
    const latestPayment = payments[0];
    return new Response(
      JSON.stringify({
        payment_status: latestPayment?.status || "no_payment",
        reconciled: false,
        message: latestPayment
          ? `Latest payment status: ${latestPayment.status}`
          : "No payment attempts found for this order",
        total_attempts: payments.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
