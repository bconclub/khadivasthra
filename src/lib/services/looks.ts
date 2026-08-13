import { supabase } from '@/lib/supabase';
import type { Look, LookFormData, ProductWithCategory } from '@/types';

/** Active looks, curated order. Used for listings and "other looks". */
export async function getLooks(): Promise<Look[]> {
  const { data, error } = await supabase
    .from('looks')
    .select('*, look_products(count)')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((l) => ({
    ...l,
    product_count: (l.look_products as { count: number }[] | null)?.[0]?.count ?? 0,
  })) as Look[];
}

/** Looks flagged for the homepage. */
export async function getFeaturedLooks(): Promise<Look[]> {
  const { data, error } = await supabase
    .from('looks')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('display_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as Look[];
}

/** Everything the admin manages, including hidden looks. */
export async function getAllLooks(): Promise<Look[]> {
  const { data, error } = await supabase
    .from('looks')
    .select('*, look_products(count)')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((l) => ({
    ...l,
    product_count: (l.look_products as { count: number }[] | null)?.[0]?.count ?? 0,
  })) as Look[];
}

/** A single look with its products, in the order the admin arranged them. */
export async function getLookBySlug(slug: string): Promise<Look | null> {
  const { data, error } = await supabase
    .from('looks')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  if (!data) return null;

  const look = data as Look;
  look.products = await getLookProducts(look.id);
  look.product_count = look.products.length;
  return look;
}

export async function getLookProducts(lookId: string): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('look_products')
    .select('sort_order, product:products(*, category:categories(*))')
    .eq('look_id', lookId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);

  return (data || [])
    .map((row) => (row as unknown as { product: ProductWithCategory }).product)
    // A product removed or deactivated shouldn't leave a hole in the look.
    .filter((p): p is ProductWithCategory => Boolean(p) && p.is_active);
}

// ---- Admin CRUD ------------------------------------------------------------

export async function createLook(data: LookFormData, productIds: string[]): Promise<Look> {
  const { data: look, error } = await supabase.from('looks').insert(data).select().single();
  if (error) throw new Error(error.message);
  if (productIds.length > 0) await setLookProducts(look.id, productIds);
  return look as Look;
}

export async function updateLook(
  id: string,
  data: Partial<LookFormData>,
  productIds?: string[]
): Promise<void> {
  const { data: rows, error } = await supabase
    .from('looks')
    .update(data)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  // An RLS-blocked update reports success with zero rows — surface it instead
  // of letting the admin believe the look saved.
  if (!rows || rows.length === 0) {
    throw new Error("Look was not saved — your admin account lacks the 'looks' permission.");
  }
  if (productIds) await setLookProducts(id, productIds);
}

export async function deleteLook(id: string): Promise<void> {
  const { error } = await supabase.from('looks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Replace a look's products wholesale, preserving the given order. */
export async function setLookProducts(lookId: string, productIds: string[]): Promise<void> {
  const { error: delError } = await supabase.from('look_products').delete().eq('look_id', lookId);
  if (delError) throw new Error(delError.message);
  if (productIds.length === 0) return;

  const rows = productIds.map((product_id, i) => ({
    look_id: lookId,
    product_id,
    sort_order: i,
  }));
  const { error } = await supabase.from('look_products').insert(rows);
  if (error) throw new Error(error.message);
}
