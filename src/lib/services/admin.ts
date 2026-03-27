import { supabase } from '@/lib/supabase';
import type { Product, Category, Banner, ProductFormData, CategoryFormData, BannerFormData, ProductWithCategory } from '@/types';

// Admin: get ALL products (including hidden) with category data
export async function getAllProducts(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
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
    throw new Error(error.message || error.details || JSON.stringify(error));
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
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
}

export async function updateProductOrder(updates: { id: string; display_order: number }[]): Promise<void> {
  // Update each product's display_order
  const promises = updates.map(({ id, display_order }) =>
    supabase.from('products').update({ display_order }).eq('id', id)
  );
  const results = await Promise.all(promises);
  const err = results.find((r) => r.error);
  if (err?.error) throw err.error;
}

// Categories CRUD
export async function createCategory(data: CategoryFormData): Promise<Category> {
  const { data: category, error } = await supabase
    .from('categories')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
  return category;
}

export async function updateCategory(id: string, data: Partial<CategoryFormData>): Promise<Category> {
  const { data: category, error } = await supabase
    .from('categories')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
  return category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
}

// Banners CRUD
export async function createBanner(data: BannerFormData): Promise<Banner> {
  const { data: banner, error } = await supabase
    .from('banners')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
  return banner;
}

export async function updateBanner(id: string, data: Partial<BannerFormData>): Promise<Banner> {
  const { data: banner, error } = await supabase
    .from('banners')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
  return banner;
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
}

export async function getBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
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
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
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

// Delete an order
export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
}

// Dashboard stats
export async function getDashboardStats() {
  const [
    { count: totalProducts },
    { count: totalCategories },
    { count: totalOrders },
    { count: pendingOrders },
    { count: confirmedOrders },
    { count: totalViews },
    { count: cancelledOrders },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('product_views').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
  ]);

  // Get all orders for revenue calculations
  const { data: orders } = await supabase
    .from('orders')
    .select('total, status, payment_status');

  const totalRevenue = orders
    ?.filter(o => ['confirmed', 'shipped', 'delivered'].includes(o.status))
    .reduce((sum, o) => sum + Number(o.total), 0) || 0;

  const totalOrderValue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

  // Abandoned carts: orders that are pending or cancelled + never paid
  const abandonedOrders = orders?.filter(o => (o.status === 'pending' || o.status === 'cancelled') && o.payment_status !== 'paid') || [];
  const abandonedCarts = abandonedOrders.length;
  const abandonedValue = abandonedOrders.reduce((sum, o) => sum + Number(o.total), 0);

  return {
    totalProducts: totalProducts || 0,
    totalCategories: totalCategories || 0,
    totalOrders: totalOrders || 0,
    pendingOrders: pendingOrders || 0,
    confirmedOrders: confirmedOrders || 0,
    cancelledOrders: cancelledOrders || 0,
    totalRevenue,
    totalOrderValue,
    totalViews: totalViews || 0,
    abandonedCarts,
    abandonedValue,
  };
}
