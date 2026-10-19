// Server-to-server backstop: Easebuzz calls this on every transaction status
// change, so a payment is recorded even if the shopper never comes back to
// the site. Set this function's URL as the Transaction Webhook in the
// Easebuzz dashboard. Easebuzz retries anything other than a 200.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, applyTransaction, parseForm, verifyResponseHash } from "../_shared/easebuzz.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const txn = await parseForm(req);

  // This endpoint is public: ignore anything not signed with our salt.
  if (!(await verifyResponseHash(txn))) {
    console.warn("Easebuzz webhook rejected: hash mismatch for txn", txn.txnid);
    return new Response("invalid hash", { status: 401 });
  }

  try {
    const { outcome } = await applyTransaction(adminClient(), txn);
    console.log("Easebuzz webhook", txn.txnid, txn.status, "→", outcome);
    // not_found and mismatch are logged; retrying would not change them.
    return new Response(JSON.stringify({ outcome }), { status: 200 });
  } catch (e) {
    console.error("Easebuzz webhook error", e);
    return new Response("error", { status: 500 });
  }
});
