import { supabase } from '@/lib/supabase';
import type { Category } from '@/types';

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data || [];
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
