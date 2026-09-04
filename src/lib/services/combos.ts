import { supabase } from '@/lib/supabase';
import { getProductColors, getProductVariants } from '@/lib/services/products';
import type { Combo, ComboFormData, ProductWithCategory } from '@/types';

/** Master switch from site settings; the storefront hides combos when off. */
export async function combosEnabled(): Promise<boolean> {
  const { data } = await supabase.from('settings').select('combos_enabled').limit(1).single();
  return data?.combos_enabled === true;
}

export async function getCombos(): Promise<Combo[]> {
  if (!(await combosEnabled())) return [];
  const { data, error } = await supabase
    .from('combos')
    .select('*, combo_products(count)')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((c) => ({
    ...c,
    product_count: (c.combo_products as { count: number }[] | null)?.[0]?.count ?? 0,
  })) as Combo[];
}

export async function getFeaturedCombos(): Promise<Combo[]> {
  const { data, error } = await supabase
    .from('combos')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('display_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as Combo[];
}

/** Everything the admin manages, including hidden combos. */
export async function getAllCombos(): Promise<Combo[]> {
  const { data, error } = await supabase
    .from('combos')
    .select('*, combo_products(count)')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((c) => ({
    ...c,
    product_count: (c.combo_products as { count: number }[] | null)?.[0]?.count ?? 0,
  })) as Combo[];
}

export async function getComboBySlug(slug: string): Promise<Combo | null> {
  if (!(await combosEnabled())) return null;
  const { data, error } = await supabase
    .from('combos')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  if (!data) return null;

  const combo = data as Combo;
  combo.products = await getComboProducts(combo.id);
  combo.product_count = combo.products.length;
  return combo;
}

export async function getComboProducts(comboId: string): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('combo_products')
    .select('sort_order, product:products(*, category:categories(*))')
    .eq('combo_id', comboId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);

  const products = (data || [])
    .map((row) => (row as unknown as { product: ProductWithCategory }).product)
    // A product removed or deactivated shouldn't leave a hole in the pool.
    .filter((p): p is ProductWithCategory => Boolean(p) && p.is_active);

  // The configurator needs sizes and colours to build a real order line, so
  // variant data is loaded up front rather than per selection.
  await Promise.all(
    products
      .filter((p) => p.has_variants)
      .map(async (p) => {
        p.colors = await getProductColors(p.id);
        p.variants = await getProductVariants(p.id);
      })
  );

  return products;
}

// ---- Admin CRUD ------------------------------------------------------------

export async function createCombo(data: ComboFormData, productIds: string[]): Promise<Combo> {
  const { data: combo, error } = await supabase.from('combos').insert(data).select().single();
  if (error) throw new Error(error.message);
  if (productIds.length > 0) await setComboProducts(combo.id, productIds);
  return combo as Combo;
}

export async function updateCombo(
  id: string,
  data: Partial<ComboFormData>,
  productIds?: string[]
): Promise<void> {
  const { data: rows, error } = await supabase
    .from('combos')
    .update(data)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  // An RLS-blocked update reports success with zero rows.
  if (!rows || rows.length === 0) {
    throw new Error("Combo was not saved — your admin account lacks the 'combos' permission.");
  }
  if (productIds) await setComboProducts(id, productIds);
}

export async function deleteCombo(id: string): Promise<void> {
  const { error } = await supabase.from('combos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Replace a combo's pool wholesale, preserving the given order. */
export async function setComboProducts(comboId: string, productIds: string[]): Promise<void> {
  const { error: delError } = await supabase
    .from('combo_products')
    .delete()
    .eq('combo_id', comboId);
  if (delError) throw new Error(delError.message);
  if (productIds.length === 0) return;

  const rows = productIds.map((product_id, i) => ({
    combo_id: comboId,
    product_id,
    sort_order: i,
  }));
  const { error } = await supabase.from('combo_products').insert(rows);
  if (error) throw new Error(error.message);
}
