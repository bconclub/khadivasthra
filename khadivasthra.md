# Khadi Vasthra — Build Truth

> **Version:** 0.3.6  
> **Last Updated:** 2026-03-31  
> **Framework:** Next.js 16.1.1 (Static Export)  
> **Data Layer:** Supabase (PostgreSQL + Storage)  
> **Payment:** Razorpay (live key configured)  

---

## 1. Technology Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16.1.1 (App Router) |
| React | 19.2.3 |
| Language | TypeScript 5.x (strict mode) |
| Styling | Tailwind CSS 4.x + `@tailwindcss/postcss` |
| Icons | `lucide-react` |
| UI Utils | `clsx`, `tailwind-merge` |
| Carousel | `embla-carousel-react` |
| Notifications | `react-hot-toast` |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (`product-images`, `category-images`, `banner-images`) |
| Payments | Razorpay (`useRazorpay` hook) |
| Bundler | Webpack (`--webpack` flag on dev/build) |

---

## 2. Build Commands

```bash
# Install dependencies
npm install

# Development server (Next.js only, port 3000)
npm run dev

# Production build
# 1. Generates feed.xml, sitemap.xml, robots.txt from Supabase
# 2. Runs next build --webpack
npm run build

# Generate SEO feeds only
npm run generate:feeds

# Migrate legacy JSON data into Supabase
npm run migrate

# Lint
npm run lint
```

**No PHP server is started.** The old `dev:backend`, `check:php`, and `build:static` scripts have been removed.

---

## 3. Project Structure

```
khadivasthra/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (storefront)
│   │   │   ├── page.tsx              # Homepage
│   │   │   ├── shop/
│   │   │   │   ├── page.tsx          # All products
│   │   │   │   └── [category]/       # Category filtered shop
│   │   │   ├── product/[slug]/       # Product detail page
│   │   │   ├── cart/                 # Shopping cart
│   │   │   ├── checkout/             # Checkout + Razorpay
│   │   │   ├── order-success/        # Post-payment success
│   │   │   ├── track/                # Order tracking
│   │   │   ├── status/               # Order status lookup
│   │   │   ├── collections/          # Collections page
│   │   │   ├── offers/               # Offers page
│   │   │   ├── contact/              # Contact page
│   │   │   ├── return-policy/        # Return policy
│   │   │   └── terms/                # Terms & conditions
│   │   ├── admin/                    # Built-in admin panel
│   │   │   ├── page.tsx              # Admin dashboard
│   │   │   ├── login/                # Admin login
│   │   │   ├── products/             # Product CRUD
│   │   │   ├── categories/           # Category CRUD
│   │   │   ├── orders/               # Order management
│   │   │   ├── banners/              # Banner management
│   │   │   └── settings/             # Site settings
│   │   ├── layout.tsx                # Root layout (fonts, analytics)
│   │   ├── globals.css               # Tailwind + custom styles
│   │   └── not-found.tsx             # 404 page
│   ├── components/
│   │   ├── layout/                   # Header, Footer, CartDrawer, etc.
│   │   ├── product/                  # ProductCard, ProductCarousel
│   │   ├── admin/                    # Admin forms (ProductForm, BannerForm, etc.)
│   │   └── ui/                       # Button, ToastProvider
│   ├── context/
│   │   ├── CartContext.tsx
│   │   ├── AdminAuthContext.tsx
│   │   └── SearchContext.tsx
│   ├── hooks/
│   │   └── useRazorpay.ts
│   ├── data/
│   │   └── products.json             # Legacy fallback data (mostly unused)
│   ├── lib/
│   │   └── utils.ts                  # `cn()` helper
│   └── types/
│       ├── index.ts                  # App types (Product, Order, Category, Banner, etc.)
│       └── razorpay.d.ts
├── scripts/
│   ├── generate-feeds.ts             # Builds sitemap.xml, feed.xml, robots.txt
│   └── migrate-to-supabase.ts        # One-time JSON → Supabase migration
├── supabase/
│   ├── schema.sql                    # Full DB schema + RLS policies
│   └── migrations/                   # SQL migrations
├── public/
│   ├── images/products/              # Product images (static + uploaded)
│   ├── images/card covers/           # Collection card images
│   ├── api/                          # ⚠️ DEAD CODE — legacy PHP files
│   ├── data/                         # ⚠️ DEAD CODE — legacy JSON files
│   ├── feed.xml                      # Auto-generated product feed
│   ├── sitemap.xml                   # Auto-generated sitemap
│   ├── robots.txt                    # Auto-generated robots.txt
│   ├── og-image.webp                 # OpenGraph image
│   ├── Cover KV.webp                 # Hero cover
│   ├── KV Logo Colour.webp           # Logo
│   └── version.json                  # Build version manifest
├── next.config.ts                    # Static export config
├── package.json                      # v0.3.6
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── .env.local                        # Supabase + Razorpay keys
```

---

## 4. Build Configuration

### `next.config.ts`
- **Output:** `export` (static HTML to `out/`)
- **Trailing Slash:** `true`
- **Images:** `unoptimized: true` (required for static export)
- **Remote Patterns:** `placehold.co`, `*.supabase.co`
- **Webpack:** Custom `resolve.modules` to ensure `node_modules` resolution from project root
- **Env:** `NEXT_PUBLIC_APP_VERSION` injected from `package.json`

### `package.json` scripts
```json
{
  "dev": "next dev --webpack",
  "build": "npx tsx scripts/generate-feeds.ts && next build --webpack",
  "generate:feeds": "npx tsx --env-file=.env.local scripts/generate-feeds.ts",
  "migrate": "npx tsx --env-file=.env.local scripts/migrate-to-supabase.ts",
  "lint": "eslint"
}
```

---

## 5. Data Architecture (Supabase)

### Tables
| Table | Purpose |
|-------|---------|
| `categories` | Product categories (slug, image, display_order, is_active) |
| `products` | Full product catalog (price, stock, images, details JSONB, flags) |
| `orders` | Customer orders (items JSONB, Razorpay IDs, shipping, status) |
| `settings` | Singleton store config (whatsapp, address, COD toggle, store open) |
| `banners` | Homepage/promo banners (size, link_type, schedule) |
| `product_views` | Analytics — page view events |

### Storage Buckets
- `product-images` — product photos
- `category-images` — category thumbnails
- `banner-images` — promotional banners

### Row Level Security (RLS)
- **Public (storefront):** `SELECT` on categories, products, settings, banners; `INSERT` on orders, product_views.
- **Authenticated (admin):** `ALL` privileges on every table.

### Key DB Features
- `updated_at` triggers on all mutable tables.
- `decrement_stock()` function for inventory management.
- Indexes on `slug`, `category_id`, `is_featured`, `is_best_seller`, `status`, `created_at`.

---

## 6. Admin Panel

The admin panel is **part of the Next.js app**, not a separate PHP backend.

| Route | Function |
|-------|----------|
| `/admin/login` | Supabase auth login |
| `/admin` | Dashboard overview |
| `/admin/products` | Add / edit / delete products |
| `/admin/categories` | Category management |
| `/admin/orders` | View & update order status |
| `/admin/banners` | Banner scheduling & links |
| `/admin/settings` | Store info, WhatsApp, COD toggle |

**Auth:** Uses `AdminAuthContext.tsx` + Supabase Auth.

---

## 7. Storefront Features

1. **Product Catalog**
   - Category filtering (`/shop/[category]/`)
   - Price sorting
   - Featured / New / Best Seller badges
   - Search overlay (global)

2. **Product Detail**
   - Image gallery
   - Material, care instructions, dimensions
   - Related products carousel

3. **Cart & Checkout**
   - LocalStorage-based cart (`CartContext`)
   - Razorpay integration (`useRazorpay.ts`)
   - COD option (configurable in settings)
   - Order success page

4. **Order Management**
   - Order tracking (`/track/`)
   - Order status lookup (`/status/`)
   - Article number & settlement tracking in admin

5. **SEO & Marketing**
   - Auto-generated `sitemap.xml` (static + dynamic pages)
   - Google Shopping `feed.xml`
   - `robots.txt`
   - OpenGraph + Twitter meta tags
   - Structured product data in feed

6. **Analytics**
   - Google Analytics 4 (`G-EGD59S8H70`)
   - Microsoft Clarity (`vr228w1p9c`)
   - Meta Pixel (`1639469843739310`)

---

## 8. Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_RAZORPAY_KEY_ID=<razorpay-live-key>
```

**Note:** `generate-feeds.ts` and `migrate-to-supabase.ts` require `--env-file=.env.local` to read these values at runtime.

---

## 9. Build Pipeline

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────┐
│  generate-feeds │────▶│  next build --webpack│────▶│   out/      │
│  (Supabase API) │     │  (Static Export)     │     │  (deploy)   │
└─────────────────┘     └─────────────────────┘     └─────────────┘
        │
        ▼
   public/feed.xml
   public/sitemap.xml
   public/robots.txt
```

### `out/` folder contents
- Static HTML for every route (`index.html`, `shop/index.html`, `product/*/index.html`, etc.)
- `_next/static/` — compiled JS/CSS assets
- `images/` — copied from `public/images/`
- `feed.xml`, `sitemap.xml`, `robots.txt` — copied from `public/`

---

## 10. Deployment

1. Run `npm run build`
2. Upload **contents** of `out/` to your static host root (e.g., `public_html/`).
3. Ensure Supabase project is live and RLS policies are active.
4. No server-side runtime is required for the storefront (pure static export).

**Admin access** is served from the same static export at `/admin/index.html`; it talks directly to Supabase from the browser.

---

## 11. Legacy / Dead Code

The following files/directories are **legacy artifacts** from an earlier PHP-backed version and are **not used by the current build**:

- `public/api/*.php` (`auth.php`, `products.php`, `categories.php`, `upload.php`)
- `public/data/*.json` (`products.json`, `categories.json`)
- `src/data/products.json` — kept only as a fallback reference
- Any documentation referencing a "PHP backend" or "port 8080" is obsolete.

---

## 12. Design System

- **Primary:** Maroon (`#8B0000`)
- **Secondary:** Cream (`#F5E6D3`)
- **Accent:** Gold / Saffron
- **Heading Font:** Playfair Display
- **Body Font:** Outfit
- **Approach:** Mobile-first, Tailwind utility classes

---

## 13. Quick Reference

| Task | Command / Location |
|------|-------------------|
| Run dev | `npm run dev` |
| Build | `npm run build` |
| Update sitemap/feed | `npm run generate:feeds` |
| Add product | `/admin/products` (browser) |
| Change WhatsApp | `/admin/settings` (browser) |
| DB schema | `supabase/schema.sql` |
| Types | `src/types/index.ts` |
| Razorpay key | `.env.local` → `NEXT_PUBLIC_RAZORPAY_KEY_ID` |

---

*This document reflects the actual state of the codebase as of the last edit. If the stack or structure changes, update this file to keep it the single source of build truth.*
