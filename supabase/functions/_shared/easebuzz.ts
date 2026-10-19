// Easebuzz (Federal Bank) helpers shared by the easebuzz-* functions.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   EASEBUZZ_KEY, EASEBUZZ_SALT   merchant key and salt from Easebuzz
//   EASEBUZZ_ENV                  "test" (default) or "prod"
//   SITE_URL                      storefront origin, default https://khadivasthra.com
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const EASEBUZZ_KEY = (Deno.env.get("EASEBUZZ_KEY") ?? "").trim();
export const EASEBUZZ_SALT = (Deno.env.get("EASEBUZZ_SALT") ?? "").trim();
export const IS_PROD = (Deno.env.get("EASEBUZZ_ENV") ?? "test").trim().toLowerCase() === "prod";
export const PAY_BASE = IS_PROD ? "https://pay.easebuzz.in" : "https://testpay.easebuzz.in";
export const DASHBOARD_BASE = IS_PROD ? "https://dashboard.easebuzz.in" : "https://testdashboard.easebuzz.in";
export const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://khadivasthra.com").replace(/\/+$/, "");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export function isConfigured(): boolean {
  return EASEBUZZ_KEY.length > 0 && EASEBUZZ_SALT.length > 0;
}

export async function sha512(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const UDFS = ["udf1", "udf2", "udf3", "udf4", "udf5", "udf6", "udf7", "udf8", "udf9", "udf10"];

/** key|txnid|amount|productinfo|firstname|email|udf1..udf10|salt */
export function requestHash(p: Record<string, string>): Promise<string> {
  const parts = [p.key, p.txnid, p.amount, p.productinfo, p.firstname, p.email, ...UDFS.map((u) => p[u] ?? ""), EASEBUZZ_SALT];
  return sha512(parts.join("|"));
}

/**
 * Reverse hash on responses (surl/furl, webhook, Transaction API):
 * [additional_charges|]salt|status|udf10..udf1|email|firstname|productinfo|amount|txnid|key
 */
export async function verifyResponseHash(p: Record<string, string>): Promise<boolean> {
  if (!p.hash || !isConfigured()) return false;
  const parts = [
    EASEBUZZ_SALT, p.status ?? "", ...[...UDFS].reverse().map((u) => p[u] ?? ""),
    p.email ?? "", p.firstname ?? "", p.productinfo ?? "", p.amount ?? "", p.txnid ?? "", p.key ?? "",
  ];
  if (p.additional_charges && p.additional_charges !== "NA") parts.unshift(p.additional_charges);
  const expected = await sha512(parts.join("|"));
  return safeEqual(expected, p.hash.toLowerCase());
}

/** Easebuzz needs the amount as a float string, and it is hashed as sent. */
export function formatAmount(total: number | string): string {
  return Number(total).toFixed(2);
}

/** Strip characters a given Easebuzz field rejects. */
export function clean(value: string | null | undefined, allowed: RegExp, max: number): string {
  return (value ?? "").replace(allowed, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function parseForm(req: Request): Promise<Record<string, string>> {
  const raw = await req.text();
  const out: Record<string, string> = {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      for (const [k, v] of Object.entries(parsed)) out[k] = v == null ? "" : String(v);
      return out;
    }
  } catch { /* not JSON — form encoded, as Easebuzz sends it */ }
  for (const [k, v] of new URLSearchParams(raw)) out[k] = v;
  return out;
}

export type Outcome = "paid" | "failed" | "pending" | "mismatch" | "not_found";

const FAILED_STATUSES = new Set(["failure", "usercancelled", "dropped", "bounced", "autorefunded"]);

/**
 * Apply a hash-verified Easebuzz transaction to its order. Safe to call any
 * number of times from the redirect, the webhook and status checks: the paid
 * transition happens once, and only that call books the shipment.
 */
export async function applyTransaction(
  supabase: SupabaseClient,
  txn: Record<string, string>,
): Promise<{ outcome: Outcome; order?: { id: string; order_number: string; total: number } }> {
  // udf1 carries our order id; fall back to the stored txnid.
  let query = supabase.from("orders").select("id, order_number, total, status, payment_status, gateway_txn_id").limit(1);
  query = txn.udf1 ? query.eq("id", txn.udf1) : query.eq("gateway_txn_id", txn.txnid);
  const { data: rows } = await query;
  const order = rows?.[0];
  if (!order) {
    console.error("Easebuzz: no order for txn", txn.txnid, txn.udf1);
    return { outcome: "not_found" };
  }
  const summary = { id: order.id, order_number: order.order_number, total: Number(order.total) };

  const response = { ...txn };
  delete response.hash;
  const status = (txn.status ?? "").toLowerCase();

  if (status === "success") {
    if (Math.abs(Number(txn.amount) - Number(order.total)) > 0.01) {
      console.error("Easebuzz: amount mismatch for order", order.id, txn.amount, order.total);
      await supabase.from("orders").update({ gateway_response: response }).eq("id", order.id);
      return { outcome: "mismatch", order: summary };
    }
    if (order.payment_status === "paid") return { outcome: "paid", order: summary };

    const { data: updated, error } = await supabase
      .from("orders")
      .update({
        payment_gateway: "easebuzz",
        payment_status: "paid",
        status: order.status === "pending" ? "confirmed" : order.status,
        gateway_txn_id: txn.txnid,
        gateway_payment_id: txn.easepayid || null,
        gateway_response: response,
      })
      .eq("id", order.id)
      .neq("payment_status", "paid")
      .select("id");
    if (error) throw new Error(`Failed to mark order paid: ${error.message}`);

    if (updated && updated.length > 0) await bookShipment(order.id);
    return { outcome: "paid", order: summary };
  }

  if (FAILED_STATUSES.has(status)) {
    // Only the latest attempt may fail the order; a stale failure must not
    // override a newer attempt that is still in flight.
    if (order.payment_status === "pending" && (!order.gateway_txn_id || order.gateway_txn_id === txn.txnid)) {
      await supabase
        .from("orders")
        .update({ payment_status: "failed", gateway_response: response })
        .eq("id", order.id)
        .eq("payment_status", "pending");
    }
    return { outcome: order.payment_status === "paid" ? "paid" : "failed", order: summary };
  }

  return { outcome: order.payment_status === "paid" ? "paid" : "pending", order: summary };
}

/** Same auto-booking the Razorpay verify step does; never fails the payment. */
async function bookShipment(orderId: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/shiprocket-create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ order_id: orderId }),
    });
    if (!res.ok) console.error("Shiprocket auto-create failed:", res.status, await res.text());
  } catch (e) {
    console.error("Shiprocket auto-create error:", e);
  }
}
