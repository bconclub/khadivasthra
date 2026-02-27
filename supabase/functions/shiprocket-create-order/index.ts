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
    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch order from Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
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

    // Skip if already has a Shiprocket order
    if (order.shiprocket_order_id) {
      return new Response(
        JSON.stringify({
          shiprocket_order_id: order.shiprocket_order_id,
          shipment_id: order.shipment_id,
          awb_code: order.awb_code,
          message: "Shiprocket order already exists",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = await getShiprocketToken();

    // Calculate total items for weight
    const items = order.items || [];
    const totalQuantity = items.reduce(
      (sum: number, item: { quantity: number }) => sum + item.quantity,
      0
    );
    const weight = Math.max(0.5, totalQuantity * 0.5);

    // Split customer name into first/last
    const nameParts = (order.customer_name || "").trim().split(" ");
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Format order date
    const orderDate = new Date(order.created_at)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);

    // Map items to Shiprocket format
    const shiprocketItems = items.map(
      (item: {
        product_name: string;
        product_id: string;
        quantity: number;
        price: number;
      }) => ({
        name: item.product_name,
        sku: item.product_id,
        units: item.quantity,
        selling_price: item.price,
        discount: 0,
        tax: 0,
      })
    );

    // Create Shiprocket order
    const createRes = await fetch(
      `${SHIPROCKET_BASE}/orders/create/adhoc`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: order.order_number,
          order_date: orderDate,
          pickup_location: "Primary",
          billing_customer_name: firstName,
          billing_last_name: lastName,
          billing_address: order.customer_address,
          billing_city: order.customer_city,
          billing_pincode: order.customer_pincode,
          billing_state: order.customer_state,
          billing_country: "India",
          billing_email: order.customer_email || "",
          billing_phone: order.customer_phone,
          shipping_is_billing: true,
          order_items: shiprocketItems,
          payment_method: "Prepaid",
          sub_total: order.subtotal,
          length: 30,
          breadth: 20,
          height: 5,
          weight,
        }),
      }
    );

    if (!createRes.ok) {
      const errBody = await createRes.text();
      console.error("Shiprocket create order error:", errBody);
      return new Response(
        JSON.stringify({ error: "Failed to create Shiprocket order" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const createData = await createRes.json();
    const shiprocketOrderId = String(createData.order_id);
    const shipmentId = String(createData.shipment_id);

    // Update order with Shiprocket IDs
    await supabase
      .from("orders")
      .update({
        shiprocket_order_id: shiprocketOrderId,
        shipment_id: shipmentId,
      })
      .eq("id", order_id);

    // Try to auto-assign AWB (cheapest courier)
    let awbCode = null;
    let courierName = null;
    let trackingUrl = null;

    try {
      const awbRes = await fetch(
        `${SHIPROCKET_BASE}/courier/assign/awb`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ shipment_id: shipmentId }),
        }
      );

      if (awbRes.ok) {
        const awbData = await awbRes.json();
        awbCode =
          awbData?.response?.data?.awb_code ||
          awbData?.awb_code ||
          null;
        courierName =
          awbData?.response?.data?.courier_name ||
          awbData?.courier_name ||
          null;

        if (awbCode) {
          trackingUrl = `https://shiprocket.co/tracking/${awbCode}`;

          await supabase
            .from("orders")
            .update({
              awb_code: awbCode,
              courier_name: courierName,
              tracking_url: trackingUrl,
            })
            .eq("id", order_id);
        }
      } else {
        console.error(
          "AWB assignment failed:",
          await awbRes.text()
        );
      }
    } catch (awbErr) {
      console.error("AWB assignment error:", awbErr);
    }

    return new Response(
      JSON.stringify({
        shiprocket_order_id: shiprocketOrderId,
        shipment_id: shipmentId,
        awb_code: awbCode,
        courier_name: courierName,
        tracking_url: trackingUrl,
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
