import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  cleanPhone,
  corsHeaders,
  finiteNumber,
  getShipwayConfig,
  json,
  missingShipwaySecrets,
  requireOrderAdmin,
  shipwayRequest,
} from "../_shared/shipway.ts";

type OrderItem = {
  product_id?: string;
  product_name?: string;
  price?: number;
  quantity?: number;
  size?: string | null;
  color_name?: string | null;
};

function safeId(value: unknown) {
  const id = String(value || "").trim();
  return /^[0-9a-f-]{36}$/i.test(id) ? id : "";
}

function personName(value: unknown) {
  const parts = String(value || "Customer").trim().split(/\s+/);
  return {
    first: parts[0] || "Customer",
    last: parts.slice(1).join(" ") || ".",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireOrderAdmin(req);
  if (auth.error) return auth.error;

  try {
    const input = await req.json();
    const action = String(input.action || "status");
    const config = getShipwayConfig();
    const missing = missingShipwaySecrets(config);

    if (action === "status") {
      return json({
        configured: missing.length === 0,
        missing,
        required: [
          "SHIPWAY_EMAIL",
          "SHIPWAY_LICENSE_KEY",
          "SHIPWAY_WAREHOUSE_ID",
          "SHIPWAY_RETURN_WAREHOUSE_ID",
        ],
        optional: [
          "SHIPWAY_PICKUP_PINCODE",
          "SHIPWAY_PACKAGING_WEIGHT_KG",
          "SHIPWAY_MIN_BOX_LENGTH_CM",
          "SHIPWAY_MIN_BOX_BREADTH_CM",
          "SHIPWAY_MIN_BOX_HEIGHT_CM",
        ],
        pickup_pincode: config.pickupPincode,
        parcel_defaults: {
          packaging_weight_kg: config.packagingWeightKg,
          min_box_cm: [
            config.minBoxLengthCm,
            config.minBoxBreadthCm,
            config.minBoxHeightCm,
          ],
        },
      });
    }

    if (missing.length > 0) {
      return json({ error: "Shipway setup is incomplete", missing }, 503);
    }

    if (action === "warehouses") {
      const response = await shipwayRequest("/api/getwarehouses", { method: "GET" }, config);
      return json({ warehouses: response });
    }

    const orderId = safeId(input.order_id);
    if (!orderId) return json({ error: "Valid order_id is required" }, 400);

    const { data: order, error: orderError } = await auth.admin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (orderError || !order) return json({ error: "Order not found" }, 404);

    if (action === "cancel") {
      if (order.shipping_provider !== "shipway" || !order.awb_code) {
        return json({ error: "This order has no active Shipway AWB" }, 400);
      }
      const response = await shipwayRequest("/api/Cancel/", {
        method: "POST",
        body: JSON.stringify({ awb_number: [order.awb_code] }),
      }, config) as { success?: unknown; error?: unknown; message?: unknown };
      if (!response?.success || response?.error === true) {
        return json({ error: String(response?.message || "Shipway cancellation failed") }, 502);
      }
      await auth.admin.from("orders").update({
        shipping_status: "cancelled",
        shipping_metadata: {
          ...(order.shipping_metadata && typeof order.shipping_metadata === "object"
            ? order.shipping_metadata
            : {}),
          cancel_response: response,
        },
      }).eq("id", orderId);
      return json({ cancelled: true, response });
    }

    if (action !== "book") return json({ error: "Unknown action" }, 400);
    if (order.shipping_provider === "shipway" && order.awb_code) {
      return json({
        booked: true,
        already_exists: true,
        awb_code: order.awb_code,
        courier_name: order.courier_name,
        label_url: order.shipping_label_url,
      });
    }
    if (order.awb_code && order.shipping_provider && order.shipping_provider !== "shipway") {
      return json({ error: `Order is already booked with ${order.shipping_provider}` }, 409);
    }

    const items = (Array.isArray(order.items) ? order.items : []) as OrderItem[];
    if (items.length === 0) return json({ error: "Order has no products" }, 400);
    const productIds = [...new Set(items.map((item) => item.product_id).filter(Boolean))];
    const { data: products } = productIds.length
      ? await auth.admin.from("products")
        .select("id, weight, length, breadth, height")
        .in("id", productIds)
      : { data: [] };

    let productWeightKg = 0;
    let lengthCm = config.minBoxLengthCm;
    let breadthCm = config.minBoxBreadthCm;
    let stackedHeightCm = 0;
    for (const item of items) {
      const quantity = Math.max(1, Math.round(finiteNumber(item.quantity, 1)));
      const product = products?.find((row) => row.id === item.product_id);
      productWeightKg += finiteNumber(product?.weight, 0.2) * quantity;
      lengthCm = Math.max(lengthCm, finiteNumber(product?.length, 13));
      breadthCm = Math.max(breadthCm, finiteNumber(product?.breadth, 7));
      stackedHeightCm += finiteNumber(product?.height, 3) * quantity;
    }
    const deadWeightKg = productWeightKg + config.packagingWeightKg;
    const heightCm = Math.max(config.minBoxHeightCm, stackedHeightCm);
    const volumetricWeightKg = (lengthCm * breadthCm * heightCm) / 5000;
    const chargeableWeightKg = Math.max(0.5, deadWeightKg, volumetricWeightKg);
    const customer = personName(order.customer_name);
    const phone = cleanPhone(order.customer_phone);
    if (!/^\d{10}$/.test(phone)) return json({ error: "Order has an invalid customer phone" }, 400);
    if (!/^\d{6}$/.test(String(order.customer_pincode || ""))) {
      return json({ error: "Order has an invalid customer pincode" }, 400);
    }

    const payload: Record<string, unknown> = {
      order_id: order.order_number,
      warehouse_id: config.warehouseId,
      return_warehouse_id: config.returnWarehouseId,
      products: items.map((item) => {
        const variant = [item.color_name, item.size].filter(Boolean).join(" / ");
        return {
          product: `${item.product_name || "Product"}${variant ? ` (${variant})` : ""}`,
          price: String(finiteNumber(item.price)),
          product_code: item.product_id || order.order_number,
          product_quantity: String(Math.max(1, Math.round(finiteNumber(item.quantity, 1)))),
          discount: "0",
        };
      }),
      payment_type: order.payment_method === "cod" ? "C" : "P",
      email: order.customer_email || "",
      shipping: String(finiteNumber(order.shipping)),
      order_total: String(finiteNumber(order.total)),
      billing_address: order.customer_address,
      billing_city: order.customer_city,
      billing_state: order.customer_state,
      billing_country: "India",
      billing_firstname: customer.first,
      billing_lastname: customer.last,
      billing_phone: phone,
      billing_zipcode: order.customer_pincode,
      shipping_address: order.customer_address,
      shipping_city: order.customer_city,
      shipping_state: order.customer_state,
      shipping_country: "India",
      shipping_firstname: customer.first,
      shipping_lastname: customer.last,
      shipping_phone: phone,
      shipping_zipcode: order.customer_pincode,
      order_weight: String(Math.ceil(deadWeightKg * 1000)),
      box_length: String(Math.ceil(lengthCm)),
      box_breadth: String(Math.ceil(breadthCm)),
      box_height: String(Math.ceil(heightCm)),
      order_date: new Date(order.created_at).toISOString().replace("T", " ").slice(0, 19),
      invoice_number: order.invoice_number || order.order_number,
    };
    if (input.carrier_id) payload.carrier_id = Number(input.carrier_id);

    const response = await shipwayRequest("/api/v2orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }, config) as {
      success?: unknown;
      message?: unknown;
      awb_response?: {
        success?: unknown;
        message?: unknown;
        AWB?: string | number;
        carrier_id?: string | number;
        shipping_url?: string;
      };
    };
    const awb = response?.awb_response?.AWB
      ? String(response.awb_response.AWB)
      : "";
    if (!response?.success || !response?.awb_response?.success || !awb) {
      return json({ error: String(response?.awb_response?.message || response?.message || "Shipway did not assign an AWB") }, 502);
    }

    const labelUrl = response.awb_response.shipping_url || null;
    const carrierId = response.awb_response.carrier_id
      ? String(response.awb_response.carrier_id)
      : null;
    const update = {
      shipping_provider: "shipway",
      shipping_provider_order_id: order.order_number,
      shipping_provider_shipment_id: awb,
      shipping_status: "booked",
      shipping_label_url: labelUrl,
      courier_id: carrierId,
      awb_code: awb,
      tracking_url: null,
      charged_weight: Number(chargeableWeightKg.toFixed(3)),
      shipping_metadata: {
        booking_response: response,
        parcel: {
          dead_weight_kg: Number(deadWeightKg.toFixed(3)),
          volumetric_weight_kg: Number(volumetricWeightKg.toFixed(3)),
          chargeable_weight_kg: Number(chargeableWeightKg.toFixed(3)),
          dimensions_cm: [Math.ceil(lengthCm), Math.ceil(breadthCm), Math.ceil(heightCm)],
        },
      },
    };
    const { data: updated, error: updateError } = await auth.admin
      .from("orders")
      .update(update)
      .eq("id", orderId)
      .select("id")
      .single();
    if (updateError || !updated) {
      console.error("Shipway booking saved remotely but local update failed", updateError?.message);
      return json({
        error: "Shipment booked in Shipway, but order record was not updated",
        recovery: { awb_code: awb, label_url: labelUrl, carrier_id: carrierId },
      }, 500);
    }

    await auth.admin.from("activity_log").insert({
      actor_id: auth.userId,
      actor_type: "admin",
      action: "shipment.book.shipway",
      entity: "orders",
      entity_id: orderId,
      metadata: { awb_code: awb, carrier_id: carrierId },
    });

    return json({
      booked: true,
      awb_code: awb,
      carrier_id: carrierId,
      label_url: labelUrl,
      parcel: update.shipping_metadata.parcel,
    });
  } catch (error) {
    console.error("Shipway admin operation failed", error instanceof Error ? error.message : error);
    return json({ error: error instanceof Error ? error.message : "Shipway operation failed" }, 502);
  }
});
