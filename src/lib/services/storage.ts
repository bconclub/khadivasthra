import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compress-image';

export async function uploadProductImage(original: File, productSlug: string): Promise<string> {
  const file = await compressImage(original);
  const ext = file.name.split('.').pop();
  const fileName = `${productSlug}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function uploadCategoryImage(original: File, categorySlug: string): Promise<string> {
  const file = await compressImage(original);
  const ext = file.name.split('.').pop();
  const fileName = `${categorySlug}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('category-images')
    .upload(fileName, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage
    .from('category-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function uploadBannerImage(original: File): Promise<string> {
  // Banners run full width, so they keep more pixels.
  const file = await compressImage(original, 2400, 0.82);
  const ext = file.name.split('.').pop();
  const fileName = `banners/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('banner-images')
    .upload(fileName, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage
    .from('banner-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function deleteStorageFile(bucket: string, filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error) throw error;
}
