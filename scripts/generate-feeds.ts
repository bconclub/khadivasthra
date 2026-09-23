/**
 * Generate sitemap and robots.txt
 * Run: npx tsx --env-file=.env.local scripts/generate-feeds.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// --- Config ---
const SITE_URL = "https://khadivasthra.com";

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
    { path: "/return-policy/", priority: "0.4", changefreq: "monthly" },
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
