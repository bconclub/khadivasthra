import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import ShopCategoryClient from "./ShopCategoryClient";

const siteUrl = "https://khadivasthra.com";

async function fetchCategory(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from('categories')
    .select('name, description, image_url, slug')
    .eq('slug', slug)
    .single();
  return data;
}

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await fetchCategory(slug);

  const name = category?.name || slug.replace(/-/g, ' ');
  const title = `${name} | Khadi Vasthra - Kerala Handloom`;
  const description = category?.description
    ? `${category.description} Shop authentic ${name} from Khadi Vasthra, Aluva, Kerala.`
    : `Shop our ${name} collection — authentic Kerala handloom from Khadi Vasthra, Aluva. Premium quality, traditional craftsmanship.`;
  const url = `${siteUrl}/shop/${slug}`;
  const image = category?.image_url || `${siteUrl}/og-image.webp`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Khadi Vasthra',
      images: [{ url: image, width: 1200, height: 630, alt: name }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    alternates: { canonical: url },
  };
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
