import { supabase } from '@/lib/supabase';
import type { Product, Category, ProductFormData, CategoryFormData } from '@/types';

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
