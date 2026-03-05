import { supabase } from '@/lib/supabase';
import type { Product, ProductWithCategory } from '@/types';

export async function getProducts(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getProductBySlug(slug: string): Promise<ProductWithCategory | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getFeaturedProducts(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('is_featured', true)
    .eq('is_active', true)
    .limit(8);
  if (error) throw error;
  return (data || []) as ProductWithCategory[];
}

export async function getBestSellingProducts(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('is_best_seller', true)
    .eq('is_active', true)
    .limit(8);
  if (error) throw error;
  return (data || []) as ProductWithCategory[];
}

export async function getProductsByCategory(categoryId: string): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getProductsByCategorySlug(slug: string): Promise<ProductWithCategory[]> {
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .single();
  if (!category) return [];
  return getProductsByCategory(category.id);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .eq('category_id', product.category_id)
    .eq('is_active', true)
    .neq('id', product.id)
    .limit(limit);
  if (error) throw error;
  return (data || []) as ProductWithCategory[];
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
