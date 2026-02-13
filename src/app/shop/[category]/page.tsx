import { createClient } from '@supabase/supabase-js';
import ShopCategoryClient from "./ShopCategoryClient";

export async function generateStaticParams() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: categories } = await supabase
    .from('categories')
    .select('slug');

  return (categories || []).map((cat) => ({
    category: cat.slug,
  }));
}

export const dynamicParams = false;

export default async function ShopCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  return <ShopCategoryClient slug={category} />;
}
