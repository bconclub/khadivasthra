import { createClient } from '@supabase/supabase-js';

export async function generateStaticParams() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: products } = await supabase
    .from('products')
    .select('slug')
    .eq('is_active', true);

  return (products || []).map((product) => ({
    slug: product.slug,
  }));
}

export const dynamicParams = false;

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
