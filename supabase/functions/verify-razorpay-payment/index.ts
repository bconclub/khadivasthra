import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
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
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          razorpay_payment_id,
          razorpay_signature,
          payment_status: "paid",
          status: "confirmed",
        })
        .eq("id", order_id);

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

      // Auto-create Shiprocket shipment (non-blocking — don't fail payment if this errors)
      try {
        const shiprocketUrl = `${SUPABASE_URL}/functions/v1/shiprocket-create-order`;
        const shipRes = await fetch(shiprocketUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ order_id }),
        });
        if (!shipRes.ok) {
          console.error("Shiprocket auto-create failed:", await shipRes.text());
        }
      } catch (shipErr) {
        console.error("Shiprocket auto-create error:", shipErr);
      }

      return new Response(JSON.stringify({ verified: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      await supabase
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", order_id);

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
