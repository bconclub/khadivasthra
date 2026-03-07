/**
 * Generate product catalog feeds, sitemap, and robots.txt
 * Run: npx tsx --env-file=.env.local scripts/generate-feeds.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// --- Config ---
const SITE_URL = "https://khadivasthra.com";
const BRAND = "Khadi Vasthra";
const CURRENCY = "INR";
const GOOGLE_CATEGORY_ID = 5388; // Traditional & Ceremonial Clothing

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Types ---
interface Category {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  description: string;
  long_description: string | null;
  image_url: string | null;
  images: string[];
  material: string | null;
  in_stock: boolean;
  stock_quantity: number;
  is_active: boolean;
  weight: number;
  updated_at: string;
  category: Category;
}

// --- Helpers ---
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatPrice(amount: number): string {
  return `${Number(amount).toFixed(2)} ${CURRENCY}`;
}

function toAbsoluteUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return `${SITE_URL}${url}`;
}

// --- Data Fetching ---
async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

// --- Product Feed (Google Shopping + Meta Commerce) ---
function generateProductFeed(products: Product[]): string {
  const items: string[] = [];
  let skipped = 0;

  for (const p of products) {
    if (!p.image_url) {
      console.warn(`  Skipping "${p.name}" — no image`);
      skipped++;
      continue;
    }

    const description = p.description || `${p.name}${p.material ? ` - ${p.material}` : ""} from ${BRAND}`;
    const link = `${SITE_URL}/product/${p.slug}/`;
    const imageLink = toAbsoluteUrl(p.image_url);
    const availability = p.in_stock ? "in stock" : "out of stock";
    const hasDiscount = p.compare_price && Number(p.compare_price) > Number(p.price);

    let priceFields: string;
    if (hasDiscount) {
      priceFields = `      <g:price>${formatPrice(Number(p.compare_price))}</g:price>
      <g:sale_price>${formatPrice(Number(p.price))}</g:sale_price>`;
    } else {
      priceFields = `      <g:price>${formatPrice(Number(p.price))}</g:price>`;
    }

    // Additional images (up to 10)
    const additionalImages = (p.images || [])
      .filter((img) => img && img !== p.image_url)
      .slice(0, 10)
      .map((img) => `      <g:additional_image_link>${escapeXml(toAbsoluteUrl(img))}</g:additional_image_link>`)
      .join("\n");

    const materialField = p.material
      ? `\n      <g:material>${escapeXml(p.material)}</g:material>`
      : "";

    const categoryName = p.category?.name || "Mundus";

    items.push(`    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.name.slice(0, 150))}</g:title>
      <g:description>${escapeXml(description.slice(0, 5000))}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(imageLink)}</g:image_link>
${additionalImages ? additionalImages + "\n" : ""}      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
${priceFields}
      <g:brand>${BRAND}</g:brand>
      <g:google_product_category>${GOOGLE_CATEGORY_ID}</g:google_product_category>
      <g:product_type>${escapeXml(categoryName)}</g:product_type>
      <g:shipping_weight>${Number(p.weight || 0.2).toFixed(2)} kg</g:shipping_weight>${materialField}
      <g:identifier_exists>false</g:identifier_exists>
    </item>`);
  }

  if (skipped > 0) {
    console.warn(`  ${skipped} product(s) skipped (no image)`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${BRAND}</title>
    <link>${SITE_URL}</link>
    <description>Premium traditional Kerala mundus and dhotis - handloom quality</description>
${items.join("\n")}
  </channel>
</rss>`;
}

// --- Sitemap ---
function generateSitemap(products: Product[], categories: Category[]): string {
  const urls: { loc: string; priority: string; changefreq: string; lastmod?: string }[] = [];

  // Static pages
  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/shop/", priority: "0.9", changefreq: "daily" },
    { path: "/collections/", priority: "0.8", changefreq: "weekly" },
    { path: "/offers/", priority: "0.8", changefreq: "weekly" },
    { path: "/contact/", priority: "0.5", changefreq: "monthly" },
    { path: "/track/", priority: "0.3", changefreq: "monthly" },
  ];

  for (const page of staticPages) {
    urls.push({
      loc: `${SITE_URL}${page.path}`,
      priority: page.priority,
      changefreq: page.changefreq,
    });
  }

  // Category pages
  for (const cat of categories) {
    urls.push({
      loc: `${SITE_URL}/shop/${cat.slug}/`,
      priority: "0.8",
      changefreq: "weekly",
    });
  }

  // Product pages
  for (const p of products) {
    urls.push({
      loc: `${SITE_URL}/product/${p.slug}/`,
      priority: "0.7",
      changefreq: "weekly",
      lastmod: p.updated_at ? new Date(p.updated_at).toISOString().split("T")[0] : undefined,
    });
  }

  const urlEntries = urls
    .map(
      (u) =>
        `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

// --- Robots.txt ---
function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

Disallow: /admin/
Disallow: /cart/
Disallow: /checkout/
Disallow: /order-success/
Disallow: /status/

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

// --- Main ---
async function main() {
  console.log("=== Generating feeds, sitemap & robots.txt ===\n");

  const products = await fetchProducts();
  const categories = await fetchCategories();
  console.log(`Fetched ${products.length} products, ${categories.length} categories\n`);

  const publicDir = path.join(__dirname, "..", "public");

  // Product feed
  const feedXml = generateProductFeed(products);
  fs.writeFileSync(path.join(publicDir, "feed.xml"), feedXml, "utf8");
  console.log(`  feed.xml       (${products.length} products, ${(feedXml.length / 1024).toFixed(1)} KB)`);

  // Sitemap
  const sitemapXml = generateSitemap(products, categories);
  fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf8");
  const urlCount = (sitemapXml.match(/<url>/g) || []).length;
  console.log(`  sitemap.xml    (${urlCount} URLs)`);

  // Robots.txt
  const robotsTxt = generateRobotsTxt();
  fs.writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt, "utf8");
  console.log(`  robots.txt`);

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Feed generation failed:", err);
  process.exit(1);
});
