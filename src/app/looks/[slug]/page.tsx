import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import LookClient from "./LookClient";

const SITE_URL = "https://khadivasthra.com";

function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// `output: export` treats an empty param list as "generateStaticParams is
// missing" and fails the whole build, so when there are no looks yet we still
// emit one placeholder route. It renders the normal "Look not found" state.
const NO_LOOKS_PLACEHOLDER = [{ slug: "none" }];

export async function generateStaticParams() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NO_LOOKS_PLACEHOLDER;
  try {
    // The looks table may not exist yet on a fresh database.
    const { data, error } = await client().from("looks").select("slug");
    if (error || !data || data.length === 0) return NO_LOOKS_PLACEHOLDER;
    return data.map((l: { slug: string }) => ({ slug: l.slug }));
  } catch {
    return NO_LOOKS_PLACEHOLDER;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  let look: { name: string; description: string | null; image_url: string; slug: string } | null = null;
  try {
    const { data } = await client()
      .from("looks")
      .select("name, description, image_url, slug")
      .eq("slug", slug)
      .single();
    look = data;
  } catch {
    return {};
  }
  if (!look) return {};

  const title = `${look.name} | Shop the Look | Khadi Vasthra`;
  const description =
    look.description || `Shop every piece in the ${look.name} look from Khadi Vasthra.`;
  const url = `${SITE_URL}/looks/${look.slug}`;
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
      images: look.image_url ? [{ url: look.image_url, alt: look.name }] : undefined,
    },
  };
}

export default async function LookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LookClient slug={slug} />;
}
