# Khadivasthra marketplace catalog feeds

## Data sources

| Platform | Scheduled feed URL | Format |
| --- | --- | --- |
| Google Merchant Center | `https://khadivasthra.com/feed.xml` | Google RSS 2.0 XML |
| Meta Commerce Manager | `https://khadivasthra.com/meta-feed.csv` | Catalog CSV |

Both feeds use active retail products in store Supabase. Active color/size variants receive their own stable item ID, stock, price adjustment, color image, and selected variant URL. Wholesale products and inactive categories are excluded. Build uses the same generator as the three-hour GitHub Actions refresh; refresh uploads only these two files to Hostinger. Out-of-stock products stay in feeds with `out of stock` status, preserving stable item IDs.

Run `npm run generate:feeds` locally with `.env.local`. The production build generates these files too. Feed refresh requires the repository's existing `FTP_HOST`, `FTP_USERNAME`, and `FTP_PASSWORD` secrets. Check the scheduled workflow after merge and compare live files with local output.

## Merchant account setup

1. Verify and claim `khadivasthra.com` in Google Merchant Center, select India and INR, and add the XML URL as a scheduled product source. Enable free listings or ads as intended.
2. Configure shipping services and delivery areas in Merchant Center to match actual checkout rates and courier coverage. The checkout currently uses item-count tiers plus a pincode availability check, so the feed does not promise shipping to every Indian pincode.
3. Configure return policy in Merchant Center to match the site's published policy. Resolve the existing website/onboarding return-policy mismatch before requesting approval.
4. Add the CSV URL to Meta Commerce Manager as a scheduled data feed. Connect the appropriate business assets and review catalog diagnostics. A catalog feed alone does not create individual Facebook Marketplace listings or guarantee Shop/Marketplace eligibility.
5. Review Google and Meta diagnostics after the first ingestion. Do not enable promotions until product approvals, landing pages, checkout, shipping, and returns agree.

## Catalog data requiring merchant review

- At the 23 September 2026 export, 115 of 144 feed rows lacked structured color and six lacked material. Add accurate `colours` and `material` values in product admin; the generator will include them on its next run. Do not infer color from a product title.
- `age_group=adult` and `gender=unisex` are defaults; obvious women's wear is marked `female`. Review any product that does not fit those labels before account submission.
- No GTIN is stored. Variant SKU is emitted as MPN when present; do not fabricate GTINs or claim that identifiers do not exist.
- Product titles, descriptions, images, prices, and fabric claims need merchant review. Feed generation removes the former blanket handloom claim, but existing product descriptions remain source data.
- No merchant account has ingested these feeds yet. Platform approvals and channel eligibility remain unverified.

Google's [product data specification](https://support.google.com/merchants/answer/7052112) and [apparel guidance](https://support.google.com/merchants/answer/7348545) govern final account validation.
