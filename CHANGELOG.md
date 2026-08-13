# Changelog

## 2026-08-13 · every image was distorted and 3x too heavy

- **Root cause of the "zoomed in / wider / broken" images.** Supabase's transform endpoint does not preserve aspect ratio when given `width` alone — it resizes the width but keeps the *original* height. A 1122x1402 category photo came back as 400x1402, squashed horizontally, which is why models looked stretched and heads were cut off by the crop. Adding `resize=contain` returns a correct 400x500.
- **This was also the slow loading.** Keeping full height made each file ~741 KB instead of ~236 KB; the average transformed image is now 65 KB. All 984 variants were re-generated and cached.


## 2026-08-12 (4) · side menu category tiles no longer crop to heads

- Category art is portrait (~1122x1402, 3:4) but the side-menu tiles were a landscape 4:3 box anchored to the top, so each tile showed only the model's head. Tiles are portrait now and crop from the centre, matching the source.


## 2026-08-12 (3) · hero at full size, header no longer overlaps pages

- **Hero was squeezed.** It was locked to 3:1 desktop / 4:3 mobile, but the uploaded banner is actually 1536x1022 (3:2) — so `object-cover` cropped it into a thin strip. Desktop now uses the image's own 3:2 ratio (the whole banner, ~843px tall at 1280) and mobile gets a generous 62vh instead of 281px.
- Hero images are requested at full-HD width (1920, capped to the source) rather than 1100.
- **The fixed header was sitting on top of page headings.** Top clearance only applied to shop and product routes, so checkout, cart and the rest were overlapped; every route except the homepage now gets it.

Note: the hero banner is a 4 MB PNG served for both desktop and mobile. It reaches browsers as ~215 KB WebP, but re-exporting it as a JPEG, and uploading a genuinely portrait crop for mobile, would improve both quality and load further.


## 2026-08-12 (2) · fix mobile layout broken by the hero

- **The homepage overflowed sideways on phones.** Yesterday's hero change paired `aspect-ratio` with a `min-height`; when the minimum height won, the ratio forced the *width* to match — 416px tall x 4:3 made the hero 555px wide inside a 375px screen, shoving the whole page off-centre. The minimum height is gone and the hero is pinned to full width.
- Hero copy, logo and CTAs tightened so they sit inside the banner at both sizes instead of spilling past its bottom edge.


## 2026-08-12 · checkout music, hero sizing, image quality

- New checkout track (`Khadivasthra Checkout Music.m4a`), replacing the mp3.
- **Hero sizes itself to the banner.** With an admin hero banner set the section now uses that image's own aspect ratio (2172×724 desktop, 1448×1086 mobile) instead of a full-viewport height that cropped the creative.
- **Category cards no longer cut faces** — images anchor to the top of the frame rather than centre.
- **Image quality restored.** The first optimisation pass went too far (500px @ q70); widths are now ~2x their display size at quality 82 — a product photo is 79 KB instead of 471 KB and still looks sharp.
- **No more slow first load.** Supabase generates each transform on first request, so the first visitor waited. All 492 variants were pre-generated, and cards now fade in once decoded instead of showing an empty frame.


## 2026-08-04 (5) · image weight cut ~90%, hero flash fixed

- **Product photos were being served at full size.** Uploads are 1–2.5 MB PNGs and the site is a static export, so Next.js image optimisation never applied — 246 images totalling **300 MB**, averaging 1.25 MB each, with 162 over 1 MB. Images now go through Supabase's transform endpoint at sensible widths; a real browser gets WebP at ~36 KB instead of 471 KB (**~92% smaller**). No re-uploading needed — originals are untouched.
- **Hero no longer flashes the wrong image.** The packaged cover rendered immediately and then swapped once the admin banner query resolved; it's now held back until that query settles.


## 2026-08-04 (4) · card/page photo mismatch, fuller Best Selling

- **A product looked like two different products.** The listing card shows the product's main photo, but the product page showed *only* the selected colour's images — so the shirt was a flat-lay outside and a model shot inside. The main photo now leads the gallery, followed by colour and gallery images.
- **Best Selling was down to two items.** Excluding trending duplicates and sold-out stock left almost nothing, so the row now tops up with other in-stock products to a full eight, and reads up to 24 flagged best sellers instead of 8.


## 2026-08-04 (3) · payment recording fixed at the source

- **Root cause of unpaid-looking orders.** `payment_status` was only ever set by a callback running in the shopper's *browser* after Razorpay succeeded. Close the tab or lose signal at that moment and Razorpay keeps the money while this database never hears about it. There was no server-side backstop.
- **New `razorpay-webhook` function** — Razorpay now notifies us directly on `payment.captured`, so payment is recorded no matter what the browser does. Signature-verified; needs `RAZORPAY_WEBHOOK_SECRET` set and the endpoint registered in the Razorpay dashboard.
- **Retries are now traceable.** A shopper who retries gets a brand-new Razorpay order, but we only ever stored the first id — so lookups against that id found nothing even when the retry was paid. Our internal order id is now stamped into Razorpay `notes`, and reconciliation also searches by `receipt`.
- **New `reconcile-payments` function** — read-only by default, checks every pending online order against Razorpay and only marks the genuinely captured ones paid. Unlike `check-payment-status` it never creates shipments, so it is safe to run over already-delivered orders.


## 2026-08-04 (2) · product gallery fix + COD settled/pending tabs

- **Product photos were being dropped.** The main image and the gallery are stored in separate columns, and the page returned the gallery *instead of* the main photo whenever one existed — so a product with a main shot plus one gallery shot showed a single picture. They're merged and de-duplicated now; 90 products were affected.
- **COD orders split into Pending and Settled tabs** alongside the existing COD tab, so unsettled cash-on-delivery money is visible at a glance.


## 2026-08-04 · COD save fix, settlement toggle, heritage banner

- **COD fields silently failed to save.** A row-level-security policy that blocks an update makes Postgres report success with zero rows changed, so the admin saw "saved" while nothing persisted. `updateOrder` now verifies a row actually changed and raises a clear permissions error instead.
- **Settlement status is now three tap-to-set buttons** (Pending / Received / Settled) inside the COD box instead of a dropdown; it saves on tap and visibly reverts if the write is rejected.
- **Heritage photo is admin-managed** — new `heritage` banner placement drives the image beside the "Since 2007" story section, which was still a grey `placehold.co` placeholder on the live site.
- **WhatsApp button only appears on product pages.** Home, shop and category pages get Search back in that bottom-bar slot, since ordering over WhatsApp only makes sense once you're looking at a specific product.


## 2026-08-03 (5) · checkout music easter egg + scroll and touch fixes

- **Onam tune on checkout** — a pill beside the Checkout heading plays a short Onam track once (no loop). It tries to autoplay, falls back to a "Play Onam tune" prompt when the browser blocks audio, and switching it off is remembered so it never nags again. Audio is `preload="none"` so the 524KB file is only fetched if actually played.
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
