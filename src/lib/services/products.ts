import { supabase } from '@/lib/supabase';
import type { ProductWithCategory, ProductVariant } from '@/types';

export async function getProducts(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*), variants:product_variants(*)')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as unknown[]).map((item) => normalizeProductVariants(item as Record<string, unknown>));
}

export async function getProductBySlug(slug: string): Promise<ProductWithCategory | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*), variants:product_variants(*)')
    .eq('slug', slug)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? normalizeProductVariants(data as unknown as Record<string, unknown>) : null;
}

export async function getFeaturedProducts(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(name, slug), variants:product_variants(*)')
    .eq('is_featured', true)
    .eq('is_active', true)
    .limit(8);
  if (error) throw error;
  return ((data || []) as unknown[]).map((item) => normalizeProductVariants(item as Record<string, unknown>));
}

export async function getBestSellingProducts(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(name, slug), variants:product_variants(*)')
    .eq('is_best_seller', true)
    .eq('is_active', true)
    .limit(8);
  if (error) throw error;
  return ((data || []) as unknown[]).map((item) => normalizeProductVariants(item as Record<string, unknown>));
}

async function sortByOrderThenViews(products: ProductWithCategory[]): Promise<ProductWithCategory[]> {
  if (products.length === 0) return products;
  const { data: views } = await supabase
    .from('product_views')
    .select('product_id')
    .in('product_id', products.map((p) => p.id));
  const counts: Record<string, number> = {};
  (views || []).forEach((v) => { counts[v.product_id] = (counts[v.product_id] || 0) + 1; });
  return [...products].sort((a, b) => {
    const orderDiff = (a.display_order ?? 0) - (b.display_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return (counts[b.id] || 0) - (counts[a.id] || 0);
  });
}

export async function getProductsByCategory(categoryId: string): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*), variants:product_variants(*)')
    .eq('category_id', categoryId)
    .eq('is_active', true);
  if (error) throw error;
  return sortByOrderThenViews(((data || []) as unknown[]).map((item) => normalizeProductVariants(item as Record<string, unknown>)));
}

export async function getProductsByCategorySlug(slug: string): Promise<ProductWithCategory[]> {
  const normalized = decodeURIComponent(slug).trim().toLowerCase();
  let category: { id: string } | null = null;
  const { data: exact } = await supabase.from('categories').select('id').eq('slug', normalized).single();
  if (exact) {
    category = exact;
  } else {
    const { data: all } = await supabase.from('categories').select('id, slug');
    category = (all || []).find(c => c.slug.trim().toLowerCase() === normalized) || null;
  }
  if (!category) return [];
  return getProductsByCategory(category.id);
}

export async function getRelatedProducts(product: ProductWithCategory, limit = 4): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(name, slug), variants:product_variants(*)')
    .eq('category_id', product.category_id)
    .eq('is_active', true)
    .neq('id', product.id)
    .limit(limit);
  if (error) throw error;
  return ((data || []) as unknown[]).map((item) => normalizeProductVariants(item as Record<string, unknown>));
}

export async function recordProductView(productId: string): Promise<void> {
  let sessionId: string | null = null;
  try {
    sessionId = sessionStorage.getItem('kv_session');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('kv_session', sessionId);
    }
  } catch {
    // sessionStorage may not be available
  }
  await supabase.from('product_views').insert({
    product_id: productId,
    session_id: sessionId,
  });
}

function normalizeProductVariants(raw: Record<string, unknown>): ProductWithCategory {
  const product = raw as unknown as ProductWithCategory;
  if (!product.variants) {
    product.variants = [];
  }
  // Ensure variants is an array and filter active ones for client use
  product.variants = (Array.isArray(product.variants) ? product.variants : []).filter(
    (v: ProductVariant) => v.is_active
  );
  return product;
}

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as ProductVariant[];
}
