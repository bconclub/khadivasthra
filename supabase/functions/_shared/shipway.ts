import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export interface ShipwayConfig {
  email: string;
  licenseKey: string;
  warehouseId: string;
  returnWarehouseId: string;
  pickupPincode: string;
  packagingWeightKg: number;
  minBoxLengthCm: number;
  minBoxBreadthCm: number;
  minBoxHeightCm: number;
}

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getShipwayConfig(): ShipwayConfig {
  const warehouseId = Deno.env.get("SHIPWAY_WAREHOUSE_ID")?.trim() || "";
  return {
    email: Deno.env.get("SHIPWAY_EMAIL")?.trim() || "",
    licenseKey: Deno.env.get("SHIPWAY_LICENSE_KEY")?.trim() || "",
    warehouseId,
    returnWarehouseId:
      Deno.env.get("SHIPWAY_RETURN_WAREHOUSE_ID")?.trim() || "",
    pickupPincode:
      Deno.env.get("SHIPWAY_PICKUP_PINCODE")?.trim() || "683579",
    packagingWeightKg: positiveNumber(
      Deno.env.get("SHIPWAY_PACKAGING_WEIGHT_KG"),
      0.1,
    ),
    minBoxLengthCm: positiveNumber(
      Deno.env.get("SHIPWAY_MIN_BOX_LENGTH_CM"),
      13,
    ),
    minBoxBreadthCm: positiveNumber(
      Deno.env.get("SHIPWAY_MIN_BOX_BREADTH_CM"),
      7,
    ),
    minBoxHeightCm: positiveNumber(
      Deno.env.get("SHIPWAY_MIN_BOX_HEIGHT_CM"),
      3,
    ),
  };
}

export function missingShipwaySecrets(config = getShipwayConfig()) {
  const missing: string[] = [];
  if (!config.email) missing.push("SHIPWAY_EMAIL");
  if (!config.licenseKey) missing.push("SHIPWAY_LICENSE_KEY");
  if (!config.warehouseId) missing.push("SHIPWAY_WAREHOUSE_ID");
  if (!config.returnWarehouseId) missing.push("SHIPWAY_RETURN_WAREHOUSE_ID");
  return missing;
}

export async function shipwayRequest(
  path: string,
  init: RequestInit = {},
  config = getShipwayConfig(),
) {
  if (!config.email || !config.licenseKey) {
    throw new Error("Shipway credentials are not configured");
  }

  const response = await fetch(`https://app.shipway.com${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${btoa(`${config.email}:${config.licenseKey}`)}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }

  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${response.status}`;
    throw new Error(`Shipway request failed: ${detail}`);
  }

  return body;
}

export async function requireOrderAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return { error: json({ error: "Supabase backend is not configured" }, 503) };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = (req.headers.get("Authorization") || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token) return { error: json({ error: "Sign in required" }, 401) };

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: json({ error: "Invalid or expired session" }, 401) };
  }

  const { data: profile } = await admin
    .from("admin_profiles")
    .select("role, permissions, is_active")
    .eq("id", userData.user.id)
    .single();
  const allowed =
    profile?.is_active &&
    (profile.role === "super_admin" ||
      (Array.isArray(profile.permissions) &&
        profile.permissions.includes("orders")));
  if (!allowed) {
    return { error: json({ error: "Orders permission required" }, 403) };
  }

  return { admin, userId: userData.user.id };
}

export function cleanPhone(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function finiteNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
