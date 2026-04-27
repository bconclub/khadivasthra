import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORY_GROUPS, getGroupBySlug, categoryBelongsToGroup, type GroupSlug } from "@/lib/category-groups";
import GroupClient from "./GroupClient";

const siteUrl = "https://khadivasthra.com";

export async function generateStaticParams() {
  return CATEGORY_GROUPS.map((g) => ({ group: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ group: string }> }): Promise<Metadata> {
  const { group: groupSlug } = await params;
  const group = getGroupBySlug(groupSlug);
  if (!group) return { title: "Not found" };
  const title = `${group.label} Collection | Khadi Vasthra`;
  const description = `Shop our complete ${group.label.toLowerCase()} collection — authentic Kerala handloom from Khadi Vasthra, Aluva.`;
  const url = `${siteUrl}/shop/group/${group.slug}`;
  return {
    title,
    description,
    openGraph: { title, description, url, siteName: "Khadi Vasthra", type: "website" },
    alternates: { canonical: url },
  };
}

async function fetchCategoryIdsInGroup(groupSlug: GroupSlug): Promise<string[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("categories")
    .select("id, slug")
    .eq("is_active", true);
  return (data || [])
    .filter((c) => categoryBelongsToGroup(c.slug, groupSlug))
    .map((c) => c.id);
}

export default async function GroupPage({ params }: { params: Promise<{ group: string }> }) {
  const { group: groupSlug } = await params;
  const group = getGroupBySlug(groupSlug);
  if (!group) notFound();

  const categoryIds = await fetchCategoryIdsInGroup(group.slug);

  return <GroupClient groupLabel={group.label} groupSlug={group.slug} categoryIds={categoryIds} />;
}
