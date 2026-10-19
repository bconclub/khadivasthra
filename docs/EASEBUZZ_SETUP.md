# Easebuzz (Federal Bank) payment gateway

Online payments can go through **Razorpay** or **Easebuzz**. Only one is live
at a time, chosen in **Admin → Settings → Payment Options → Online payment
gateway**. Razorpay stays the default; nothing changes for customers until
someone switches it there.

## How it works

1. Checkout creates the order as before, then calls `easebuzz-initiate`.
   That function reads the amount from the order row (never the browser),
   signs the request, and returns an Easebuzz hosted-checkout URL.
2. The shopper pays on Easebuzz's page.
3. Easebuzz posts the result to `easebuzz-callback`, which verifies the
   reverse hash, marks the order paid (and books Shiprocket, like Razorpay),
   then redirects to `/order-success/` or back to `/checkout/?payment=failed`.
4. `easebuzz-webhook` receives the same result server-to-server, so a payment
   is recorded even if the shopper closes the tab.
5. Admin → Orders "check payment" uses `easebuzz-check-status`
   (Transaction API v2.1) for Easebuzz orders, `check-payment-status` for
   Razorpay ones.

Easebuzz requires an email, so it becomes mandatory at checkout only when
Easebuzz is the selected gateway.

## One-time setup (test / UAT)

1. Run the migration `supabase/migrations/20261019000000_payment_gateway_switch.sql`
   (SQL editor or `supabase db push`). It only adds columns; the default is Razorpay.
2. Set function secrets (Supabase → Edge Functions → Secrets), using the
   test kit key and salt from the Easebuzz email:
   - `EASEBUZZ_KEY`
   - `EASEBUZZ_SALT`
   - `EASEBUZZ_ENV` = `test`
   - `SITE_URL` = `https://khadivasthra.com` (optional, this is the default)
3. Deploy the functions:
   ```bash
   supabase functions deploy easebuzz-initiate easebuzz-check-status
   supabase functions deploy easebuzz-callback easebuzz-webhook --no-verify-jwt
   ```
4. In the Easebuzz dashboard, set the Transaction Webhook URL to
   `https://etjxdomvtsxrnbjmjzxz.supabase.co/functions/v1/easebuzz-webhook`.
5. Deploy the site (push to `main`). Razorpay is still live at this point.

## Testing before go-live

Switching the setting moves *all* customers to Easebuzz, and in test mode
no real money is taken, so test at a quiet time and switch straight back:

1. Admin → Settings → select **Easebuzz**.
2. Place a small order with Easebuzz test payment details. Check it lands
   on Payment Successful, the order is **paid / confirmed** with an Easepay ID,
   and Shiprocket booked it.
3. Try a cancelled payment: you should land back on checkout with
   "Payment was not completed".
4. Select **Razorpay** again.

If the first attempt shows "Could not start the payment", the function logs
for `easebuzz-initiate` show Easebuzz's reason (for example a hash mismatch).

## Going live

1. Get production key and salt from Easebuzz after KYC, and update
   `EASEBUZZ_KEY` / `EASEBUZZ_SALT`; set `EASEBUZZ_ENV` = `prod`.
2. Set the webhook URL in the **production** Easebuzz dashboard too.
3. Admin → Settings → select **Easebuzz**.

Switching back to Razorpay is the same switch; orders already paid either way
are unaffected. Keep the Razorpay functions deployed so old orders can still
be checked.
