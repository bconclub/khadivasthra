import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';

const SITE_URL = 'https://khadivasthra.com';

// Per-product Open Graph tags so a shared product link previews that product
// (image, name, price) instead of falling back to the site-wide homepage card.
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return {};

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: product } = await supabase
    .from('products')
    .select('name, description, price, image_url, slug, category:categories(name)')
    .eq('slug', slug)
    .single();

  if (!product) return {};

  const url = `${SITE_URL}/product/${product.slug}`;
  const title = `${product.name} | Khadi Vasthra`;
  const description =
    product.description?.trim() ||
    `${product.name} — authentic Kerala handloom from Khadi Vasthra. ₹${Number(product.price).toLocaleString()}`;
  const image = product.image_url || `${SITE_URL}/Cover KV.webp`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Khadi Vasthra',
      type: 'website',
      images: [{ url: image, width: 1200, height: 1200, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export async function generateStaticParams() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[generateStaticParams] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: products, error } = await supabase
    .from('products')
    .select('slug');

  if (error) {
    console.error('[generateStaticParams] Failed to fetch products:', error.message);
    return [];
  }

  console.log(`[generateStaticParams] Generating ${products?.length ?? 0} product pages`);

  return (products || []).map((product) => ({
    slug: product.slug,
  }));
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
