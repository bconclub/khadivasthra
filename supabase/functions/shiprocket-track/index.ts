import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SHIPROCKET_EMAIL = Deno.env.get("SHIPROCKET_EMAIL")!;
const SHIPROCKET_PASSWORD = Deno.env.get("SHIPROCKET_PASSWORD")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

async function getShiprocketToken(): Promise<string> {
  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: SHIPROCKET_EMAIL,
      password: SHIPROCKET_PASSWORD,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to authenticate with Shiprocket");
  }

  const data = await res.json();
  return data.token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_number } = await req.json();

    if (!order_number) {
      return new Response(
        JSON.stringify({ error: "order_number is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Look up order to get AWB code
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("awb_code, tracking_url, courier_name, status")
      .eq("order_number", order_number)
      .single();

    if (fetchError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // No AWB yet — shipment is still being prepared
    if (!order.awb_code) {
      return new Response(
        JSON.stringify({
          status: "processing",
          current_status: "Your order is being prepared for shipping",
          tracking_url: null,
          etd: null,
          scans: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = await getShiprocketToken();

    const trackRes = await fetch(
      `${SHIPROCKET_BASE}/courier/track/awb/${order.awb_code}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!trackRes.ok) {
      console.error("Shiprocket tracking error:", await trackRes.text());
      return new Response(
        JSON.stringify({
          status: order.status || "unknown",
          current_status: "Unable to fetch tracking details",
          tracking_url: order.tracking_url,
          etd: null,
          scans: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const trackData = await trackRes.json();
    const tracking =
      trackData?.tracking_data?.shipment_track || [];
    const trackActivities =
      trackData?.tracking_data?.shipment_track_activities || [];

    // Get current status from latest track entry
    const currentStatus =
      tracking[0]?.current_status ||
      trackData?.tracking_data?.track_status?.toString() ||
      "In Transit";
    const etd =
      tracking[0]?.edd || trackData?.tracking_data?.etd || null;

    // Map activities to scans
    const scans = trackActivities.map(
      (a: { date: string; activity: string; location: string }) => ({
        date: a.date || "",
        activity: a.activity || "",
        location: a.location || "",
      })
    );

    return new Response(
      JSON.stringify({
        status: currentStatus.toLowerCase().includes("delivered")
          ? "delivered"
          : currentStatus.toLowerCase().includes("transit")
            ? "in_transit"
            : currentStatus.toLowerCase().includes("picked")
              ? "picked_up"
              : "processing",
        current_status: currentStatus,
        tracking_url:
          order.tracking_url ||
          `https://shiprocket.co/tracking/${order.awb_code}`,
        etd,
        scans,
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
