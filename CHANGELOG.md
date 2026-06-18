# Changelog

## 2026-06-18 17:27 IST · investor portal + stock/COD fixes

- **Design Investor Portal** — new investor side of the platform:
  - `products` gain investable bifurcation + design metadata (design name/ID, design photo, product type, manufactured qty, unit cost)
  - New tables `investor_profiles`, `investments`, `settlements`, `investor_documents`, `notifications`, `activity_log` with per-investor RLS
  - `SECURITY DEFINER` reporting functions `get_investor_dashboard()` / `get_design_sales_trend()` — investors see aggregated sales without raw order access
  - `investor-manage` edge function for investor account provisioning (admin-gated)
  - `/investor` portal (login + dashboard) and `/admin/investors` management page
  - User-facing: investors can log in and track design performance, settlements, documents; admins manage investors, investments, settlements, docs, notifications. (`706b3b5`)
- **Stock overselling fixed** — cart now carries a live stock snapshot and caps quantity (add-to-cart, cart `+`), and `createOrder` re-checks current DB stock and blocks any line that exceeds it. Prevents ordering 5 when only 1 is in stock, even from a stale cart.
  - User-facing: out-of-stock-exceeding quantities are blocked at checkout with a clear message.
- **COD ₹1000 minimum hardened** — enforced at the order layer (`createOrder` throws below ₹1000) and checkout auto-resets COD→online if the cart drops below the minimum, so the rule can't be bypassed.
