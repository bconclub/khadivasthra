# Changelog

## 2026-08-03 · unified shop browsing + hero background banner

- **Unified category browsing** — `/shop` and `/shop/[category]` now render one shared `ShopBrowser` component, so the pills, sidebar, sort and grid are identical everywhere instead of three different setups.
- **Category survives back-navigation** — the active category lives in the URL rather than local state, so opening a product and pressing back returns to that category instead of dumping you into "All".
- **Category page header restored** — category name, description and thumbnail render above the grid (the old separate hero header is gone).
- **Hero background is admin-managed** — new `hero_background` banner placement drives the big cover image behind the logo, with separate mobile and desktop images; falls back to the packaged cover when unset.
- Homepage category carousel: 3 smaller portrait cards per row on mobile (was 1 full-width), horizontally scrollable.
- Static "Festival Collection / 25% Off / New Arrivals" fallback cards removed entirely; nothing renders when no admin banners are set.
- User-facing: shoppers stay in their category when browsing back from a product, category pages show a proper header, and the homepage hero can be changed without a deploy.

## 2026-07-31 · product form draft autosave + size entry fix + COD save ticks

- Product form autosaves everything as the admin types (localStorage, per-product draft slots) — a refresh or crash no longer loses a half-entered product; draft clears on successful save.
- "Add Size" now splits comma-separated input ("M, L, XL") into separate size variants — previously "M,L" became one unchoosable combined pill on the storefront.
- Data repair: Black Linen Shirt's combined "M,L" variant split back into M and L (5 stock each).
- Admin orders COD Details: each field (article number, settlement status/amount/date, invoice number) now has its own ✓ save button on the right and saves individually — no more full-list refresh jumping the page back to the top after every entry.
- User-facing: shirt sizes are individually selectable again; admins can't lose form work to a refresh or scroll position to a save.

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
