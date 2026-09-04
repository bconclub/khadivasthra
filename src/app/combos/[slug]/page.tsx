import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import ComboClient from "./ComboClient";

const SITE_URL = "https://khadivasthra.com";

function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// `output: export` treats an empty param list as "generateStaticParams is
// missing" and fails the whole build, so with no combos yet we still emit one
// placeholder route. It renders the normal "Combo not found" state.
const NO_COMBOS_PLACEHOLDER = [{ slug: "none" }];

export async function generateStaticParams() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NO_COMBOS_PLACEHOLDER;
  try {
    // The combos table may not exist yet on a fresh database.
    const { data, error } = await client().from("combos").select("slug");
    if (error || !data || data.length === 0) return NO_COMBOS_PLACEHOLDER;
    return data.map((c: { slug: string }) => ({ slug: c.slug }));
  } catch {
    return NO_COMBOS_PLACEHOLDER;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  let combo: {
    name: string;
    description: string | null;
    image_url: string | null;
    slug: string;
  } | null = null;
  try {
    const { data } = await client()
      .from("combos")
      .select("name, description, image_url, slug")
      .eq("slug", slug)
      .single();
    combo = data;
  } catch {
    return {};
  }
  if (!combo) return {};

  const title = `${combo.name} | Khadi Vasthra`;
  const description =
    combo.description || `Build your own ${combo.name} from Khadi Vasthra for one fixed price.`;
  const url = `${SITE_URL}/combos/${combo.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Khadi Vasthra",
      type: "website",
      images: combo.image_url ? [{ url: combo.image_url, alt: combo.name }] : undefined,
    },
  };
}

export default async function ComboPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ComboClient slug={slug} />;
}
