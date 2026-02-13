import { supabase } from '@/lib/supabase';
import type { SiteSettings } from '@/types';

export async function getSettings(): Promise<SiteSettings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const existing = await getSettings();
  if (!existing) throw new Error('No settings row found');

  const { data, error } = await supabase
    .from('settings')
    .update(settings)
    .eq('id', existing.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
