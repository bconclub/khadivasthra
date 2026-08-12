// Reconcile orders whose payment was captured at Razorpay but never recorded
// here, because the browser-side verify callback never ran.
//
// Deliberately narrow: it only reads Razorpay and, when a payment is genuinely
// captured, sets payment_status/razorpay_payment_id. It does NOT create
// shipments (unlike check-payment-status) — these orders have usually shipped
// already, so triggering Shiprocket would duplicate live shipments.
//
// dry_run defaults to true: report first, change nothing.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RAZORPAY_BASE = "https://api.razorpay.com/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // must opt in to writing
    const limit = Math.min(Number(body.limit) || 500, 1000);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, total, razorpay_order_id, status, created_at")
      .eq("payment_method", "online")
      .eq("payment_status", "pending")
      .not("razorpay_order_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const captured: unknown[] = [];
    const unpaid: unknown[] = [];
    const failed: unknown[] = [];

    for (const order of orders || []) {
      try {
        // A shopper who retries gets a fresh Razorpay order each attempt, but
        // we only ever stored the first id — so checking that one id alone
        // misses payments made on a retry. Every Razorpay order carries our
        // internal id as its `receipt`, so gather them all and check each.
        const razorpayOrderIds = new Set<string>();
        if (order.razorpay_order_id) razorpayOrderIds.add(order.razorpay_order_id);

        const byReceipt = await fetch(
          `${RAZORPAY_BASE}/orders?receipt=${encodeURIComponent(order.id)}&count=100`,
          { headers: { Authorization: `Basic ${auth}` } }
        );
        if (byReceipt.ok) {
          const rd = await byReceipt.json();
          for (const ro of rd.items || []) razorpayOrderIds.add(ro.id as string);
        }

        let payment: { id: string; amount: number; status: string } | undefined;
        let lookupFailed = false;
        for (const rid of razorpayOrderIds) {
          const res = await fetch(`${RAZORPAY_BASE}/orders/${rid}/payments`, {
            headers: { Authorization: `Basic ${auth}` },
          });
          if (!res.ok) { lookupFailed = true; continue; }
          const data = await res.json();
          payment = (data.items || []).find((p: { status: string }) => p.status === "captured");
          if (payment) break;
        }
        if (!payment && lookupFailed) {
          failed.push({ order_number: order.order_number, reason: "razorpay lookup error" });
          continue;
        }

        if (!payment) {
          unpaid.push({ order_number: order.order_number, total: order.total, status: order.status });
          continue;
        }

        const row = {
          order_number: order.order_number,
          total: order.total,
          razorpay_amount: payment.amount / 100,
          payment_id: payment.id,
          status: order.status,
        };

        if (!dryRun) {
          const { error: upErr } = await supabase
            .from("orders")
            .update({ razorpay_payment_id: payment.id, payment_status: "paid" })
            .eq("id", order.id);
          if (upErr) {
            failed.push({ order_number: order.order_number, reason: upErr.message });
            continue;
          }
        }
        captured.push(row);
      } catch (e) {
        failed.push({ order_number: order.order_number, reason: String(e) });
      }
    }

    return new Response(
      JSON.stringify({
        dry_run: dryRun,
        checked: orders?.length ?? 0,
        captured_count: captured.length,
        captured_value: captured.reduce((s, r) => s + Number((r as { total: number }).total), 0),
        never_paid_count: unpaid.length,
        failed_count: failed.length,
        captured,
        unpaid,
        failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
