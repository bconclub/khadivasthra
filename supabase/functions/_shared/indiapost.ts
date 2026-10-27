// India Post (Department of Posts / CEPT) customer-integration API helpers.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   INDIAPOST_USERNAME, INDIAPOST_PASSWORD   API credentials from the developer portal
//   INDIAPOST_CUSTOMER_ID                    bulk customer ID (sandbox: 9999506943)
//   INDIAPOST_CONTRACT_ID                    bulk contract (Speed Post Parcel: 41876121)
//   INDIAPOST_BASE_URL                       default sandbox https://test.cept.gov.in/beextcustomer
//   INDIAPOST_PICKUP_OR_DROPOFF              "DROPOFF" (default) or "PICKUP"
//   INDIAPOST_OFFICE_ID                      drop-off / pickup post office facility ID (optional)
//   INDIAPOST_SENDER_NAME / _ADDRESS1 / _ADDRESS2 / _CITY / _STATE / _PINCODE / _MOBILE / _EMAIL
//   INDIAPOST_PACKAGING_WEIGHT_G             added to product weight, default 100
// Calls go through the fixed-IP relay (see _shared/relay.ts); India Post only
// accepts whitelisted IPs.
import { relayFetch } from "./relay.ts";

const env = (k: string, d = "") => (Deno.env.get(k) ?? d).trim();

export function indiaPostConfig() {
  return {
    baseUrl: env("INDIAPOST_BASE_URL", "https://test.cept.gov.in/beextcustomer").replace(/\/+$/, ""),
    username: env("INDIAPOST_USERNAME"),
    password: env("INDIAPOST_PASSWORD"),
    customerId: Number(env("INDIAPOST_CUSTOMER_ID")),
    contractId: Number(env("INDIAPOST_CONTRACT_ID")),
    pickupOrDropoff: env("INDIAPOST_PICKUP_OR_DROPOFF", "DROPOFF").toUpperCase() === "PICKUP" ? "PICKUP" : "DROPOFF",
    officeId: env("INDIAPOST_OFFICE_ID") ? Number(env("INDIAPOST_OFFICE_ID")) : undefined,
    packagingWeightG: Number(env("INDIAPOST_PACKAGING_WEIGHT_G", "100")) || 100,
    sender: {
      name: env("INDIAPOST_SENDER_NAME", "Khadi Vasthra"),
      address1: env("INDIAPOST_SENDER_ADDRESS1", "Syppies Complex, Kurumassery P.O"),
      address2: env("INDIAPOST_SENDER_ADDRESS2", "Aluva"),
      city: env("INDIAPOST_SENDER_CITY", "Ernakulam"),
      state: env("INDIAPOST_SENDER_STATE", "Kerala"),
      pincode: env("INDIAPOST_SENDER_PINCODE", "683579"),
      mobile: env("INDIAPOST_SENDER_MOBILE", "8714090510"),
      email: env("INDIAPOST_SENDER_EMAIL"),
    },
  };
}

export type IndiaPostConfig = ReturnType<typeof indiaPostConfig>;

export function missingIndiaPostSecrets(c: IndiaPostConfig): string[] {
  const missing: string[] = [];
  if (!c.username) missing.push("INDIAPOST_USERNAME");
  if (!c.password) missing.push("INDIAPOST_PASSWORD");
  if (!c.customerId) missing.push("INDIAPOST_CUSTOMER_ID");
  if (!c.contractId) missing.push("INDIAPOST_CONTRACT_ID");
  return missing;
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

function errorMessage(body: Record<string, unknown>, status: number): string {
  const m = body.message ?? body.error ?? body.detail ?? (body as { raw?: string }).raw;
  return typeof m === "string" && m ? m : `India Post API error (${status})`;
}

/** Access token, valid ~15 minutes; fetched per call since bookings are occasional. */
export async function indiaPostLogin(c: IndiaPostConfig): Promise<string> {
  const res = await relayFetch(`${c.baseUrl}/v1/access/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ username: c.username, password: c.password }),
  });
  const body = await readJson(res);
  const token = (body.data as { access_token?: string } | undefined)?.access_token;
  if (!res.ok || !token) throw new Error(`India Post login failed: ${errorMessage(body, res.status)}`);
  return token;
}

export async function indiaPostRequest(
  c: IndiaPostConfig,
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ status: number; ok: boolean; body: Record<string, unknown> }> {
  const res = await relayFetch(`${c.baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: { accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return { status: res.status, ok: res.ok, body: await readJson(res) };
}

/** Raw response (for the PDF label endpoint). */
export async function indiaPostRaw(c: IndiaPostConfig, token: string, path: string, body: unknown): Promise<Response> {
  return relayFetch(`${c.baseUrl}${path}`, {
    method: "POST",
    headers: { accept: "application/pdf, application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

export function indiaPostError(body: Record<string, unknown>, status: number) {
  return errorMessage(body, status);
}
