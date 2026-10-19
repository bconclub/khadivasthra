// Easebuzz posts the payment result here (surl and furl) from the shopper's
// browser. The storefront is a static site and cannot take a POST, so this
// verifies the result, records it, and redirects the shopper back to the site.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, applyTransaction, parseForm, SITE_URL, verifyResponseHash } from "../_shared/easebuzz.ts";

function redirect(path: string) {
  return new Response(null, { status: 303, headers: { Location: `${SITE_URL}${path}` } });
}

serve(async (req) => {
  if (req.method !== "POST") return redirect("/checkout/");

  try {
    const txn = await parseForm(req);

    if (!(await verifyResponseHash(txn))) {
      console.warn("Easebuzz callback rejected: hash mismatch for txn", txn.txnid);
      return redirect("/checkout/?payment=error");
    }

    const { outcome, order } = await applyTransaction(adminClient(), txn);
    if (!order) return redirect("/checkout/?payment=error");

    const q = `order=${encodeURIComponent(order.order_number)}&total=${order.total}&gateway=easebuzz`;
    switch (outcome) {
      case "paid":
        return redirect(`/order-success/?${q}&paid=true`);
      case "pending":
        return redirect(`/order-success/?${q}&paid=false&pending=true`);
      case "mismatch":
        return redirect(`/checkout/?payment=error&order=${encodeURIComponent(order.order_number)}`);
      default:
        return redirect(`/checkout/?payment=failed&order=${encodeURIComponent(order.order_number)}`);
    }
  } catch (err) {
    console.error("easebuzz-callback error:", err);
    return redirect("/checkout/?payment=error");
  }
});
