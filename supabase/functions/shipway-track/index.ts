import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  getShipwayConfig,
  json,
  shipwayRequest,
} from "../_shared/shipway.ts";

type TrackingHistory = {
  status?: string;
  location?: string;
  timestamp?: string;
  remarks?: string;
};

function publicStatus(code: string) {
  const normalized = code.toUpperCase();
  if (normalized === "DEL") return "delivered";
  if (normalized === "OFD") return "out_for_delivery";
  if (["INT", "RINT"].includes(normalized)) return "in_transit";
  if (["PKP", "RPKP"].includes(normalized)) return "picked_up";
  if (["CAN", "PCAN", "RCAN"].includes(normalized)) return "cancelled";
  if (["RTO", "RTD"].includes(normalized)) return "returned";
  return "processing";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { order_number } = await req.json();
    const orderNumber = String(order_number || "").trim();
    if (!/^KV-[A-Za-z0-9-]+$/.test(orderNumber)) {
      return json({ error: "Valid order number is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, shipping_provider, shipping_status, awb_code, tracking_url, courier_name, status")
      .eq("order_number", orderNumber)
      .single();
    if (error || !order) return json({ error: "Order not found" }, 404);
    if (order.shipping_provider !== "shipway" || !order.awb_code) {
      return json({
        status: "processing",
        current_status: "Shipment has not been booked with Shipway",
        tracking_url: order.tracking_url || null,
        etd: null,
        scans: [],
      });
    }

    const config = getShipwayConfig();
    if (!config.email || !config.licenseKey) {
      return json({ error: "Shipway tracking is not configured" }, 503);
    }
    const params = new URLSearchParams({
      awb_numbers: order.awb_code,
      tracking_history: "1",
    });
    const response = await shipwayRequest(`/api/tracking?${params}`, { method: "GET" }, config) as Array<{
      tracking_details?: {
        shipment_status?: string;
        description?: string;
        track_url?: string;
        shipment_details?: Array<{
          current_status?: string;
          courier_name?: string;
        }>;
        tracking_history?: TrackingHistory[];
      };
    }>;
    const tracking = Array.isArray(response) ? response[0]?.tracking_details : null;
    if (!tracking) return json({ error: "Shipway returned no tracking details" }, 502);

    const code = String(tracking.shipment_status || "SCH");
    const status = publicStatus(code);
    const detail = tracking.shipment_details?.[0];
    const currentStatus = detail?.current_status || tracking.description || status;
    const trackingUrl = tracking.track_url || order.tracking_url || null;
    const scans = (tracking.tracking_history || []).map((scan) => ({
      date: scan.timestamp || "",
      activity: scan.remarks || scan.status || "",
      location: scan.location || "",
    }));

    const orderStatus = status === "delivered"
      ? "delivered"
      : status === "cancelled"
        ? "cancelled"
        : status === "in_transit" || status === "out_for_delivery" || status === "picked_up"
          ? "shipped"
          : order.status;
    await supabase.from("orders").update({
      status: orderStatus,
      shipping_status: code,
      tracking_url: trackingUrl,
      courier_name: detail?.courier_name || order.courier_name,
    }).eq("id", order.id);

    return json({
      status,
      current_status: currentStatus,
      tracking_url: trackingUrl,
      etd: null,
      scans,
    });
  } catch (error) {
    console.error("Shipway tracking failed", error instanceof Error ? error.message : error);
    return json({ error: "Could not fetch tracking" }, 502);
  }
});
