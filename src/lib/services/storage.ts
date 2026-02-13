import { supabase } from '@/lib/supabase';

export async function uploadProductImage(file: File, productSlug: string): Promise<string> {
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

export async function uploadCategoryImage(file: File, categorySlug: string): Promise<string> {
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

export async function deleteStorageFile(bucket: string, filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error) throw error;
}
