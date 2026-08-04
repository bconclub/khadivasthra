import { supabase } from '@/lib/supabase';
import type { Category } from '@/types';

// Cached like the catalogue — categories are re-read on every shop navigation.
const CATEGORIES_TTL_MS = 5 * 60 * 1000;
let categoriesCache: { data: Category[]; at: number } | null = null;
let categoriesInFlight: Promise<Category[]> | null = null;

export function invalidateCategoriesCache(): void {
  categoriesCache = null;
  categoriesInFlight = null;
}

export async function getCategories(): Promise<Category[]> {
  if (categoriesCache && Date.now() - categoriesCache.at < CATEGORIES_TTL_MS) {
    return categoriesCache.data;
  }
  if (!categoriesInFlight) {
    categoriesInFlight = (async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      const rows = (data || []) as Category[];
      categoriesCache = { data: rows, at: Date.now() };
      return rows;
    })().finally(() => { categoriesInFlight = null; });
  }
  return categoriesInFlight;
}

export async function getAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const normalized = decodeURIComponent(slug).trim().toLowerCase();
  // Try exact match first
  const { data: exact } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', normalized)
    .single();
  if (exact) return exact;
  // Fallback: match all categories normalizing slugs (handles bad slugs with spaces/casing)
  const { data: all } = await supabase.from('categories').select('*');
  return (all || []).find(c => c.slug.trim().toLowerCase() === normalized) || null;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
