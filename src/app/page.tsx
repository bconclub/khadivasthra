import { createClient } from "@supabase/supabase-js";
import HomeClient from "./HomeClient";
import type { Banner, Combo, Look } from "@/types";

/**
 * The homepage is a static export, so the hero banner is resolved here at build
 * time and handed to the client. Fetching it in the browser meant the page
 * painted an empty grey hero for a second or two before JS had even learned the
 * image URL — now the <img> is present in the very first byte of HTML and the
 * browser can start downloading it immediately.
 */
async function getHomeData(): Promise<{
  heroBanner: Banner | null;
  heritageUrl: string | null;
  featuredLooks: Look[];
  featuredCombos: Combo[];
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { heroBanner: null, heritageUrl: null, featuredLooks: [], featuredCombos: [] };

  const supabase = createClient(url, key);
  try {
  const [heroRes, heritageRes, looksRes, combosRes, settingsRes] = await Promise.all([
    supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .eq("placement", "hero_background")
      .order("display_order", { ascending: true })
      .limit(1),
    supabase
      .from("banners")
      .select("image_url")
      .eq("is_active", true)
      .eq("placement", "heritage")
      .order("display_order", { ascending: true })
      .limit(1),
    supabase
      .from("looks")
      .select("*")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("combos")
      .select("*")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("display_order", { ascending: true }),
    supabase.from("settings").select("looks_enabled, combos_enabled").limit(1),
  ]);

  // Master switch: with Shop the Look off, the homepage gets no looks at all.
  const looksEnabled = settingsRes.data?.[0]?.looks_enabled === true;
  const combosEnabled = settingsRes.data?.[0]?.combos_enabled === true;

  return {
    heroBanner: (heroRes.data?.[0] as Banner) ?? null,
    heritageUrl: (heritageRes.data?.[0]?.image_url as string) ?? null,
    featuredLooks: looksEnabled ? ((looksRes.data as Look[]) ?? []) : [],
    featuredCombos: combosEnabled ? ((combosRes.data as Combo[]) ?? []) : [],
  };
  } catch {
    // Never let a build fail because a table is missing or Supabase is down.
    return { heroBanner: null, heritageUrl: null, featuredLooks: [], featuredCombos: [] };
  }
}

export default async function Home() {
  const { heroBanner, heritageUrl, featuredLooks, featuredCombos } = await getHomeData();
  return (
    <HomeClient
      initialHeroBanner={heroBanner}
      initialHeritageUrl={heritageUrl}
      initialFeaturedLooks={featuredLooks}
      initialFeaturedCombos={featuredCombos}
    />
  );
}
