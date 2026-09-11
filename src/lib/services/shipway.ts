import { supabase } from "@/lib/supabase";

export interface ShipwaySetupStatus {
  configured: boolean;
  missing: string[];
  required: string[];
  optional: string[];
  pickup_pincode: string;
  parcel_defaults: {
    packaging_weight_kg: number;
    min_box_cm: number[];
  };
}

async function invokeShipwayAdmin(body: Record<string, unknown>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Admin sign-in required");

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/shipway-admin`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Shipway backend failed (${response.status})`);
  }
  return data;
}

export async function getShipwaySetupStatus(): Promise<ShipwaySetupStatus> {
  return invokeShipwayAdmin({ action: "status" });
}

export async function getShipwayWarehouses() {
  return invokeShipwayAdmin({ action: "warehouses" });
}

export async function bookShipwayShipment(orderId: string, carrierId?: number) {
  return invokeShipwayAdmin({
    action: "book",
    order_id: orderId,
    ...(carrierId ? { carrier_id: carrierId } : {}),
  });
}

export async function cancelShipwayShipment(orderId: string) {
  return invokeShipwayAdmin({ action: "cancel", order_id: orderId });
}
