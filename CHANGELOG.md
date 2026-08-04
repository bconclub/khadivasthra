# Changelog

## 2026-08-03 (5) · checkout music easter egg + scroll and touch fixes

- **Onam tune on checkout** — a pill beside the Checkout heading plays a looping Onam track. It tries to autoplay, falls back to a "Play Onam tune" prompt when the browser blocks audio, and switching it off is remembered so it never nags again. Audio is `preload="none"` so the 524KB file is only fetched if actually played.
- **Every page now opens at the top** — navigating from a scrolled homepage into a category kept the old scroll offset and dumped the shopper at the footer.
- **No more zoom-and-clip while scrolling on touch** — card hover zoom/lift stuck on after a tap on touch devices; those effects are now gated to hover-capable pointers.
- Best Selling no longer lists sold-out products.


## 2026-08-03 (4) · homepage header + bottom bar polish

- Homepage hero shows no header bar again — the hero logo is the branding there; the header still slides in on scroll up. Every other page keeps its header visible at the top.
- Bottom bar: "Buy on WhatsApp" label back to 10px to match the other items, and the filled WhatsApp glyph nudged to 18px so it reads the same size as the outline icons.


## 2026-08-03 (3) · menu, header overlap and bottom bar fixes

- Side menu was rendered inside `<header>`, whose `overflow-hidden` (added with the rounded corners) clipped it to the header's box — moved outside so the drawer opens full-height.
- Shop and product pages had no mobile top padding, so category headers and images slid under the fixed header; added `pt-16`.
- Bottom bar items are all equal width again, with the WhatsApp label wrapped to two lines instead of stretching its cell.
- User-facing: the menu opens properly, page content no longer hides behind the header, and the bottom bar is evenly spaced.


## 2026-08-03 (2) · shop UX pass, side menu, WhatsApp buy

- **Faster category switching** — the catalogue fetch did 2 sequential DB round-trips *per variant product* (18 extra queries); those are now batched into 2, and products/categories are cached in memory for 5 minutes so switching categories no longer sits on a spinner.
- **Sticky filters actually stick** — `overflow-x: hidden` on `html`/`body` was silently breaking every `position: sticky` header; switched to `overflow-x: clip`.
- **Header behaviour fixed** — visible at the top of the page, hides on scroll down, returns on scroll up; the logo now shows on non-homepage pages instead of only after scrolling.
- **New side menu** — full-height drawer with logo, collection chips, category tiles with images, page links, and Instagram/Facebook/phone.
- **Buy on WhatsApp** replaces Search in the bottom bar; the message is built from context — product name + price + its own link, the category, the collection, or a plain hello.
- **Per-product Open Graph tags** so a shared product link previews that product's image and name instead of the homepage card.
- Group/collection pages now use the same shared `ShopBrowser` as `/shop` and `/shop/[category]` — all three category surfaces are finally one component.
- Product carousels show 2 cards per row on mobile; Best Selling no longer repeats products already shown in Trending.
- Footer recoloured to brand coral with the transparent logo; header and banners given rounded corners.
- User-facing: shoppers can order any product over WhatsApp in one tap, browse via a proper menu, and category pages load noticeably faster.

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
