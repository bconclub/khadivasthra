import { supabase } from '@/lib/supabase';
import type { Product, Category, Banner, ProductFormData, CategoryFormData, BannerFormData, ProductWithCategory } from '@/types';

// Admin: get ALL products (including hidden) with category data
export async function getAllProducts(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Products CRUD
export async function createProduct(data: ProductFormData): Promise<Product> {
  // Check if slug already exists; if so, append a number to make it unique
  let slug = data.slug;
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('slug', slug);
  if (count && count > 0) {
    let suffix = 2;
    while (true) {
      const candidate = `${slug}-${suffix}`;
      const { count: c } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('slug', candidate);
      if (!c || c === 0) { slug = candidate; break; }
      suffix++;
    }
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert({ ...data, slug })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error(`A product with this slug already exists. Please use a different name.`);
    throw error;
  }
  return product;
}

export async function updateProduct(id: string, data: Partial<ProductFormData>): Promise<Product> {
  const { data: product, error } = await supabase
    .from('products')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

// Categories CRUD
export async function createCategory(data: CategoryFormData): Promise<Category> {
  const { data: category, error } = await supabase
    .from('categories')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return category;
}

export async function updateCategory(id: string, data: Partial<CategoryFormData>): Promise<Category> {
  const { data: category, error } = await supabase
    .from('categories')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// Banners CRUD
export async function createBanner(data: BannerFormData): Promise<Banner> {
  const { data: banner, error } = await supabase
    .from('banners')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return banner;
}

export async function updateBanner(id: string, data: Partial<BannerFormData>): Promise<Banner> {
  const { data: banner, error } = await supabase
    .from('banners')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return banner;
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw error;
}

export async function getBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getActiveBanners(): Promise<Banner[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Trigger site rebuild via GitHub Actions
export async function triggerSiteDeploy(): Promise<void> {
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;
  const token = process.env.NEXT_PUBLIC_GITHUB_DEPLOY_TOKEN;

  if (!repo || !token) {
    throw new Error('Deploy not configured. Set NEXT_PUBLIC_GITHUB_REPO and NEXT_PUBLIC_GITHUB_DEPLOY_TOKEN.');
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/deploy.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Deploy trigger failed (${res.status}): ${text}`);
  }
}

// Dashboard stats
export async function getDashboardStats() {
  const [
    { count: totalProducts },
    { count: totalCategories },
    { count: featuredProducts },
    { count: inStockProducts },
    { count: totalOrders },
    { count: pendingOrders },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_featured', true),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('in_stock', true),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const { data: orders } = await supabase
    .from('orders')
    .select('total')
    .in('status', ['confirmed', 'shipped', 'delivered']);
  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

  return {
    totalProducts: totalProducts || 0,
    totalCategories: totalCategories || 0,
    featuredProducts: featuredProducts || 0,
    inStockProducts: inStockProducts || 0,
    totalOrders: totalOrders || 0,
    pendingOrders: pendingOrders || 0,
    totalRevenue,
  };
}
