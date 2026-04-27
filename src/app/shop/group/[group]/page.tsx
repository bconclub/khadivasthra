import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CATEGORY_GROUPS, getGroupBySlug, categoryBelongsToGroup, type GroupSlug } from "@/lib/category-groups";

const siteUrl = "https://khadivasthra.com";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
}

export async function generateStaticParams() {
  return CATEGORY_GROUPS.map((g) => ({ group: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ group: string }> }): Promise<Metadata> {
  const { group: groupSlug } = await params;
  const group = getGroupBySlug(groupSlug);
  if (!group) return { title: "Not found" };
  const title = `${group.label} Collections | Khadi Vasthra`;
  const description = `Explore our ${group.label.toLowerCase()} collections — authentic Kerala handloom from Khadi Vasthra, Aluva.`;
  const url = `${siteUrl}/shop/group/${group.slug}`;
  return {
    title,
    description,
    openGraph: { title, description, url, siteName: "Khadi Vasthra", type: "website" },
    alternates: { canonical: url },
  };
}

async function fetchCategoriesInGroup(groupSlug: GroupSlug): Promise<CategoryRow[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  return (data || []).filter((c) => categoryBelongsToGroup(c.slug, groupSlug));
}

export default async function GroupPage({ params }: { params: Promise<{ group: string }> }) {
  const { group: groupSlug } = await params;
  const group = getGroupBySlug(groupSlug);
  if (!group) notFound();

  const categories = await fetchCategoriesInGroup(group.slug);

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 max-w-7xl py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-sm text-text-muted mb-2 uppercase tracking-wider">Collections</p>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-text">{group.label}</h1>
          <p className="text-text-muted mt-3 max-w-xl mx-auto">
            Explore our {group.label.toLowerCase()} collections, each crafted with traditional Kerala handloom artistry.
          </p>
        </div>

        {/* Empty state */}
        {categories.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <p className="text-text-muted text-lg">No {group.label.toLowerCase()} collections are live right now.</p>
            <Link href="/shop/" className="inline-block mt-4 text-coral hover:underline font-medium">
              Browse all products →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/shop/${cat.slug}/`}
                className="group relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                  {cat.image_url ? (
                    <Image
                      src={cat.image_url}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cream to-coral/10">
                      <span className="text-3xl font-serif text-coral/40">{cat.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h2 className="text-xl font-bold text-white font-serif">{cat.name}</h2>
                  {cat.description && (
                    <p className="text-white/80 text-sm mt-1 line-clamp-2">{cat.description}</p>
                  )}
                  <span className="inline-flex items-center text-coral text-sm font-medium mt-2 bg-white/95 px-3 py-1 rounded-full">
                    Shop now →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="text-center mt-10">
          <Link href="/" className="text-text-muted hover:text-coral text-sm transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
