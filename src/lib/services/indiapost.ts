import { supabase } from "@/lib/supabase";

async function invokeIndiaPostAdmin(body: Record<string, unknown>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Admin sign-in required");

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/indiapost-admin`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    throw new Error(data?.error || `India Post backend failed (${response.status})`);
  }
  return data;
}

export async function getIndiaPostStatus(): Promise<{
  configured: boolean;
  missing: string[];
  relay: boolean;
  base_url: string;
  connection_error: string | null;
}> {
  return invokeIndiaPostAdmin({ action: "status" });
}

/** Books Speed Post Parcel under the bulk contract. `barcode` is an optional pre-allotted article number. */
export async function bookIndiaPostShipment(orderId: string, barcode?: string) {
  return invokeIndiaPostAdmin({ action: "book", order_id: orderId, ...(barcode ? { barcode } : {}) });
}

export async function trackIndiaPostShipment(orderId: string): Promise<{ status?: string; history: unknown[]; estimated_delivery: string | null }> {
  return invokeIndiaPostAdmin({ action: "track", order_id: orderId });
}

/** Opens the India Post address label PDF in a new tab. */
export async function openIndiaPostLabel(orderId: string) {
  const { pdf_base64, content_type } = await invokeIndiaPostAdmin({ action: "label", order_id: orderId });
  const bytes = Uint8Array.from(atob(pdf_base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: content_type || "application/pdf" }));
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
