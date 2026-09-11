import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  finiteNumber,
  getShipwayConfig,
  json,
  shipwayRequest,
} from "../_shared/shipway.ts";

type RateRow = {
  carrier_id?: number | string;
  courier_name?: string;
  delivery_charge?: number | string;
  rto_charge?: number | string;
  charged_weight?: number | string;
  zone?: number | string;
};

function pincode(value: unknown) {
  const normalized = String(value || "").trim();
  return /^\d{6}$/.test(normalized) ? normalized : "";
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number = finiteNumber(value, fallback);
  return Math.min(max, Math.max(min, number));
}

async function fetchRates(
  paymentType: "prepaid" | "cod",
  parcel: {
    to: string;
    from: string;
    weight: number;
    length: number;
    breadth: number;
    height: number;
    orderValue: number;
  },
) {
  const params = new URLSearchParams({
    fromPincode: parcel.from,
    toPincode: parcel.to,
    paymentType,
    length: String(parcel.length),
    breadth: String(parcel.breadth),
    height: String(parcel.height),
    weight: String(parcel.weight),
    shipmentType: "1",
  });
  if (paymentType === "cod") {
    params.set("cummulativePrice", String(parcel.orderValue));
  }

  const body = await shipwayRequest(
    `/api/getshipwaycarrierrates?${params.toString()}`,
  ) as { success?: unknown; rate_card?: RateRow[] };
  return Array.isArray(body?.rate_card) ? body.rate_card : [];
}

function normalizeRates(rows: RateRow[]) {
  return rows
    .map((row) => ({
      courier_company_id: Number(row.carrier_id) || 0,
      courier_name: String(row.courier_name || "Shipway courier"),
      rate: finiteNumber(row.delivery_charge),
      rto_rate: finiteNumber(row.rto_charge),
      charged_weight: finiteNumber(row.charged_weight),
      zone: Number(row.zone) || null,
      etd: "",
      estimated_delivery_days: 0,
    }))
    .filter((row) => row.rate > 0)
    .sort((a, b) => a.rate - b.rate);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const input = await req.json();
    const destination = pincode(input.delivery_pincode);
    if (!destination) return json({ error: "Valid 6-digit delivery pincode is required" }, 400);

    const config = getShipwayConfig();
    if (!config.email || !config.licenseKey) {
      return json({ error: "Shipway rates are not configured" }, 503);
    }

    const itemCount = Math.round(clamp(input.total_items, 1, 99, 1));
    const requestedOrderValue = finiteNumber(input.order_value);
    if (requestedOrderValue <= 0) {
      return json({ error: "Positive order_value is required for COD rates" }, 400);
    }
    const deadWeight = clamp(
      input.weight_kg,
      0.1,
      100,
      itemCount * 0.2 + config.packagingWeightKg,
    );
    const length = clamp(input.length_cm, 1, 200, config.minBoxLengthCm);
    const breadth = clamp(input.breadth_cm, 1, 200, config.minBoxBreadthCm);
    const height = clamp(
      input.height_cm,
      1,
      200,
      Math.max(config.minBoxHeightCm, itemCount * 3),
    );
    const volumetricWeight = (length * breadth * height) / 5000;
    const chargeableWeight = Math.max(0.5, deadWeight, volumetricWeight);
    const orderValue = clamp(requestedOrderValue, 1, 1000000, 1);
    const parcel = {
      to: destination,
      from: config.pickupPincode,
      weight: Number(chargeableWeight.toFixed(3)),
      length: Math.ceil(length),
      breadth: Math.ceil(breadth),
      height: Math.ceil(height),
      orderValue,
    };

    const [prepaidRows, codRows] = await Promise.all([
      fetchRates("prepaid", parcel),
      fetchRates("cod", parcel),
    ]);
    const rates = normalizeRates(prepaidRows);
    const codRates = normalizeRates(codRows);

    return json({
      available: rates.length > 0,
      rates,
      cheapest_rate: rates[0]?.rate || 0,
      fastest_etd: "",
      cod_available: codRates.length > 0,
      cod_cheapest_rate: codRates[0]?.rate || 0,
      cod_rates: codRates,
      parcel: {
        dead_weight_kg: Number(deadWeight.toFixed(3)),
        volumetric_weight_kg: Number(volumetricWeight.toFixed(3)),
        chargeable_weight_kg: Number(chargeableWeight.toFixed(3)),
        length_cm: parcel.length,
        breadth_cm: parcel.breadth,
        height_cm: parcel.height,
      },
    });
  } catch (error) {
    console.error("Shipway rate lookup failed", error instanceof Error ? error.message : error);
    return json({ error: "Could not fetch Shipway rates" }, 502);
  }
});
