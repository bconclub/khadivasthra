// India Post shipments from Admin → Orders: book (Speed Post Parcel under the
// bulk contract), refresh tracking, and fetch the printable address label.
// Requires an admin with the "orders" permission, like shipway-admin.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { cleanPhone, corsHeaders, finiteNumber, json, requireOrderAdmin } from "../_shared/shipway.ts";
import {
  indiaPostConfig, indiaPostError, indiaPostLogin, indiaPostRaw, indiaPostRequest, missingIndiaPostSecrets,
} from "../_shared/indiapost.ts";
import { relayEnabled } from "../_shared/relay.ts";

type OrderItem = { product_id?: string; quantity?: number };

function safeId(value: unknown) {
  const id = String(value || "").trim();
  return /^[0-9a-f-]{36}$/i.test(id) ? id : "";
}

/** Split a one-line address into the two lines India Post expects. */
function addressLines(address: string): [string, string] {
  const clean = address.replace(/\s+/g, " ").trim();
  if (clean.length <= 50) return [clean, "."];
  const cut = clean.lastIndexOf(",", 50);
  const at = cut > 10 ? cut : 50;
  return [clean.slice(0, at).trim(), clean.slice(at).replace(/^,\s*/, "").trim().slice(0, 100) || "."];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireOrderAdmin(req);
  if (auth.error) return auth.error;

  try {
    const input = await req.json();
    const action = String(input.action || "status");
    const config = indiaPostConfig();
    const missing = missingIndiaPostSecrets(config);

    if (action === "status") {
      let loginOk = false;
      let connectionError: string | null = null;
      if (missing.length === 0) {
        try {
          await indiaPostLogin(config);
          loginOk = true;
        } catch (e) {
          connectionError = e instanceof Error ? e.message : "Could not reach India Post";
        }
      }
      return json({
        configured: loginOk,
        missing,
        relay: relayEnabled(),
        base_url: config.baseUrl,
        connection_error: connectionError,
      });
    }

    if (missing.length > 0) return json({ error: `India Post is not configured: ${missing.join(", ")}` }, 503);

    const orderId = safeId(input.order_id);
    if (!orderId) return json({ error: "order_id is required" }, 400);
    const { data: order } = await auth.admin.from("orders").select("*").eq("id", orderId).single();
    if (!order) return json({ error: "Order not found" }, 404);

    const token = await indiaPostLogin(config);

    // ── Tracking ────────────────────────────────────────────────────────
    if (action === "track") {
      if (order.shipping_provider !== "indiapost" || !order.awb_code) {
        return json({ error: "This order has no India Post article number" }, 400);
      }
      const r = await indiaPostRequest(config, token, `/v1/tracking/${encodeURIComponent(order.awb_code)}`);
      if (!r.ok) return json({ error: indiaPostError(r.body, r.status) }, 502);
      const data = (r.body.data ?? {}) as { currentStatus?: string; history?: unknown[]; estimatedDelivery?: string };
      await auth.admin.from("orders").update({
        shipping_status: data.currentStatus || order.shipping_status,
        shipping_metadata: { ...(order.shipping_metadata ?? {}), tracking: data, tracked_at: new Date().toISOString() },
      }).eq("id", orderId);
      return json({ status: data.currentStatus, history: data.history ?? [], estimated_delivery: data.estimatedDelivery ?? null });
    }

    // ── Address label (PDF) ─────────────────────────────────────────────
    if (action === "label") {
      if (order.shipping_provider !== "indiapost" || !order.awb_code) {
        return json({ error: "Book the order with India Post first" }, 400);
      }
      const meta = (order.shipping_metadata ?? {}) as { parcel?: { weight_g?: number; dimensions_cm?: number[] } };
      const dims = meta.parcel?.dimensions_cm ?? [20, 15, 5];
      const [l1, l2] = addressLines(order.customer_address || "");
      const isCod = order.payment_method === "cod";
      const res = await indiaPostRaw(config, token, "/v1/label/create/domestic", {
        identifier: "Domestic",
        booking_datetime: new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata" }),
        channel_type: "E",
        user_type: "A",
        user_id: config.customerId,
        customer_id: config.customerId,
        barcode_no: order.awb_code,
        service_type: "SP",
        booking_type: "COM",
        article_length: String(dims[0]),
        article_breadth: String(dims[1]),
        article_height: String(dims[2]),
        prepaid_flag: !isCod,
        vpcod_type: isCod ? "COD" : undefined,
        vpcod_value: isCod ? finiteNumber(order.total) : undefined,
        physical_weight: meta.parcel?.weight_g,
        recipient_name: order.customer_name,
        recipient_mobile: cleanPhone(order.customer_phone),
        recipient_addressl1: l1,
        recipient_addressl2: l2,
        recipient_city: order.customer_city,
        recipient_pin: order.customer_pincode,
        recipient_state: order.customer_state,
        sender_name: config.sender.name,
        sender_mobile: config.sender.mobile,
        sender_addressl1: config.sender.address1,
        sender_addressl2: config.sender.address2,
        sender_city: config.sender.city,
        sender_pin: config.sender.pincode,
        sender_state: config.sender.state,
        booking_office_pin: config.sender.pincode,
        size: "A6",
        total_amount: finiteNumber(order.total),
      });
      if (!res.ok) {
        const text = await res.text();
        return json({ error: `Label failed (${res.status}): ${text.slice(0, 200)}` }, 502);
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return json({ pdf_base64: btoa(bin), content_type: res.headers.get("content-type") || "application/pdf" });
    }

    // ── Booking ─────────────────────────────────────────────────────────
    if (action !== "book") return json({ error: "Unknown action" }, 400);
    if (order.shipping_provider === "indiapost" && order.awb_code) {
      return json({ booked: true, already_exists: true, awb_code: order.awb_code });
    }
    if (order.awb_code && order.shipping_provider && order.shipping_provider !== "indiapost") {
      return json({ error: `Order is already booked with ${order.shipping_provider}` }, 409);
    }

    const phone = cleanPhone(order.customer_phone);
    if (!/^\d{10}$/.test(phone)) return json({ error: "Order has an invalid customer phone" }, 400);
    if (!/^\d{6}$/.test(String(order.customer_pincode || ""))) return json({ error: "Order has an invalid customer pincode" }, 400);

    const items = (Array.isArray(order.items) ? order.items : []) as OrderItem[];
    if (items.length === 0) return json({ error: "Order has no products" }, 400);
    const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
    const { data: products } = productIds.length
      ? await auth.admin.from("products").select("id, weight, length, breadth, height").in("id", productIds)
      : { data: [] };

    let weightKg = 0, lengthCm = 13, breadthCm = 7, heightCm = 0;
    for (const item of items) {
      const qty = Math.max(1, Math.round(finiteNumber(item.quantity, 1)));
      const p = products?.find((row) => row.id === item.product_id);
      weightKg += finiteNumber(p?.weight, 0.2) * qty;
      lengthCm = Math.max(lengthCm, finiteNumber(p?.length, 13));
      breadthCm = Math.max(breadthCm, finiteNumber(p?.breadth, 7));
      heightCm += finiteNumber(p?.height, 3) * qty;
    }
    const weightG = Math.ceil(weightKg * 1000 + config.packagingWeightG);
    const dims = [Math.ceil(lengthCm), Math.ceil(breadthCm), Math.max(3, Math.ceil(heightCm))];
    const isCod = order.payment_method === "cod";
    const [l1, l2] = addressLines(order.customer_address || "");
    // Pre-allotted barcode, if the admin supplied one (from Bulk Customer → Barcode).
    const barcode = String(input.barcode || "").trim().toUpperCase();
    if (barcode && !/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(barcode)) return json({ error: "Barcode should look like EB123456789IN" }, 400);

    const article: Record<string, unknown> = {
      bulk_customer_id: config.customerId,
      contract_id: config.contractId,
      ...(barcode ? { barcode_no: barcode } : {}),
      pickup_or_dropoff: config.pickupOrDropoff,
      ...(config.officeId ? { pickup_dropoff_office_id: config.officeId } : {}),
      article_type: "SP",
      physical_weight: weightG,
      shape_of_article: "NROL",
      length: dims[0],
      breadth_diameter: dims[1],
      height: dims[2],
      instruction_rts: "RTS",
      sender_name: config.sender.name,
      sender_company: config.sender.name,
      sender_add_line_1: config.sender.address1,
      sender_add_line_2: config.sender.address2,
      sender_city: config.sender.city,
      sender_state: config.sender.state,
      sender_pincode: config.sender.pincode,
      ...(config.sender.email ? { sender_emailid: config.sender.email } : {}),
      sender_mobile_no: config.sender.mobile,
      receiver_name: order.customer_name,
      receiver_add_line_1: l1,
      receiver_add_line_2: l2,
      receiver_city: order.customer_city,
      receiver_state: order.customer_state,
      receiver_pincode: order.customer_pincode,
      ...(order.customer_email ? { receiver_emailid: order.customer_email } : {}),
      receiver_mobile_no: phone,
      alt_address_flag: false,
      pickup_address_flag: false,
      drop_off_pincode: config.sender.pincode,
      codr_cod: "COD",
      // Prepaid orders collect nothing on delivery.
      value_for_codr_cod: isCod ? finiteNumber(order.total) : 0,
      bulk_reference: order.order_number,
    };

    const r = await indiaPostRequest(config, token, `/process-articles-file/${config.customerId}`, {
      method: "POST",
      body: { articles: [article] },
    });
    const valid = (r.body.valid_articles as { barcode_no?: string; calculated_tariff?: number }[] | undefined) ?? [];
    const errs = (r.body.error_articles as { errors?: string[] }[] | undefined) ?? [];
    if (!r.ok || valid.length === 0) {
      const reason = errs[0]?.errors?.join("; ") || indiaPostError(r.body, r.status);
      return json({ error: `India Post booking failed: ${reason}`, response: r.body }, 502);
    }

    const awb = String(valid[0].barcode_no || barcode || "");
    const update = {
      shipping_provider: "indiapost",
      shipping_provider_order_id: String(r.body.batch_id ?? order.order_number),
      shipping_provider_shipment_id: awb || null,
      shipping_status: "booked",
      awb_code: awb || null,
      courier_name: "India Post Speed Post",
      tracking_url: awb ? `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignment=${awb}` : null,
      charged_weight: Number((weightG / 1000).toFixed(3)),
      shipping_metadata: {
        booking_response: r.body,
        tariff: valid[0].calculated_tariff ?? null,
        parcel: { weight_g: weightG, dimensions_cm: dims },
      },
    };
    const { error: updateError } = await auth.admin.from("orders").update(update).eq("id", orderId);
    if (updateError) {
      console.error("India Post booked but order update failed", updateError.message);
      return json({ error: "Booked with India Post, but the order was not updated", recovery: { awb_code: awb, response: r.body } }, 500);
    }
    await auth.admin.from("activity_log").insert({
      actor_id: auth.userId, actor_type: "admin", action: "shipment.book.indiapost",
      entity: "orders", entity_id: orderId, metadata: { awb_code: awb, tariff: valid[0].calculated_tariff ?? null },
    });

    return json({ booked: true, awb_code: awb, tariff: valid[0].calculated_tariff ?? null, parcel: update.shipping_metadata.parcel });
  } catch (error) {
    console.error("India Post admin operation failed", error instanceof Error ? error.message : error);
    return json({ error: error instanceof Error ? error.message : "India Post operation failed" }, 502);
  }
});
