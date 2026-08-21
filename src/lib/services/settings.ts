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
    .select();
  if (error) throw error;
  // A row-level-security block reports success with zero rows changed, so
  // without this the UI would claim "saved" while nothing persisted.
  if (!data || data.length === 0) {
    throw new Error(
      "Settings were not saved — your admin account doesn't have permission to edit settings."
    );
  }
  return data[0];
}
