import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
const productColumns = "id,slug,name,description,material,care_instructions,price,compare_price,image_url,images,stock_quantity,has_variants,category:categories!inner(name,is_active)";

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

serve(async (request) => {
  if (request.method !== "GET") return reply({ ok: false, error: "Method not allowed" }, 405);
  const url = new URL(request.url);
  if (url.searchParams.get("view") === "offers") {
    const now = new Date().toISOString();
    const [settings, banners, combos, products] = await Promise.all([
      db.from("settings").select("combos_enabled").limit(1).maybeSingle(),
      db.from("banners")
        .select("id,title,subtitle,image_url,placement,starts_at,ends_at,display_order")
        .eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("display_order"),
      db.from("combos")
        .select("id,name,slug,description,image_url,combo_price,choose_count,is_featured,display_order")
        .eq("is_active", true).order("display_order"),
      db.from("products")
        .select("id,name,slug,price,compare_price,image_url,images,category:categories!inner(is_active)")
        .eq("is_active", true).eq("is_wholesale", false).eq("category.is_active", true)
        .not("compare_price", "is", null).order("display_order").limit(1000),
    ]);
    if (settings.error || banners.error || combos.error || products.error) {
      return reply({ ok: false, error: "Offers unavailable" }, 503);
    }
    const discounts = (products.data || []).filter((product) =>
      Number(product.compare_price) > Number(product.price) && Number(product.price) > 0
    ).map((product) => ({
      id: product.id, name: product.name, price: Number(product.price),
      mrp: Number(product.compare_price), image: product.image_url || product.images?.[0] || null,
      url: `https://www.khadivasthra.com/product/${encodeURIComponent(product.slug)}/`,
    }));
    const activeCombos = settings.data?.combos_enabled ? (combos.data || []).map((combo) => ({
      ...combo, combo_price: Number(combo.combo_price),
      url: `https://www.khadivasthra.com/combos/${encodeURIComponent(combo.slug)}/`,
    })) : [];
    return reply({ ok: true, data: {
      banners: banners.data || [], combos: activeCombos,
      discounts: discounts.slice(0, 12), discountsTotal: discounts.length,
      website: "https://www.khadivasthra.com", checkedAt: now,
    } });
  }
  const slug = url.searchParams.get("slug")?.trim();
  const query = url.searchParams.get("q")?.trim().slice(0, 100) || "";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 5, 1), 12);
  if (slug && !/^[a-z0-9][a-z0-9-]{0,150}$/i.test(slug)) return reply({ ok: false, error: "Invalid slug" }, 400);
  if (query && /[,()]/.test(query)) return reply({ ok: false, error: "Invalid search" }, 400);

  let search = db.from("products").select(productColumns, { count: "exact" }).eq("is_active", true).eq("is_wholesale", false).eq("category.is_active", true);
  if (slug) search = search.eq("slug", slug);
  else if (query) search = search.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
  const products = await search.order("display_order").limit(slug ? 1 : limit);
  if (products.error) return reply({ ok: false, error: "Catalog unavailable" }, 503);

  const ids = (products.data || []).map((item) => item.id);
  const variants = ids.length ? await db.from("product_variants")
    .select("id,product_id,size,stock_quantity,price_adjustment,color:product_colors(name)")
    .in("product_id", ids).eq("is_active", true) : { data: [], error: null };
  if (variants.error) return reply({ ok: false, error: "Catalog unavailable" }, 503);

  const data = (products.data || []).map((product) => {
    const choices = (variants.data || []).filter((variant) => variant.product_id === product.id)
      .map((variant) => ({
        id: variant.id, size: variant.size,
        color: (variant.color as unknown as { name?: string } | null)?.name || null,
        stock: Math.max(0, Number(variant.stock_quantity) || 0),
        price: Number(product.price) + Number(variant.price_adjustment || 0),
      }));
    const totalStock = product.has_variants ? choices.reduce((sum, choice) => sum + choice.stock, 0) : Math.max(0, Number(product.stock_quantity) || 0);
    return {
      id: product.id, slug: product.slug, name: product.name,
      category: (product.category as unknown as { name?: string } | null)?.name || null,
      price: Number(product.price), mrp: product.compare_price == null ? null : Number(product.compare_price),
      description: product.description, material: product.material || null,
      care: product.care_instructions || [], image: product.image_url || product.images?.[0] || null,
      availability: { totalStock }, variants: choices,
      url: `https://www.khadivasthra.com/product/${encodeURIComponent(product.slug)}/`,
    };
  });
  return slug ? reply(data[0] ? { ok: true, data: data[0] } : { ok: false, error: "Product not found" }, data[0] ? 200 : 404)
    : reply({ ok: true, data, meta: { total: products.count ?? 0, returned: data.length, checkedAt: new Date().toISOString() } });
});
