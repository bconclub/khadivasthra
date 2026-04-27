// Top-level groupings shown on the home page.
// Each group is matched against category slugs by substring(s) — so "kavi-mundu",
// "kavi-mundus", "printed-mundu", etc. all fall under the "mundu" group automatically.

export type GroupSlug = "mundu" | "saree" | "shirt";

export interface CategoryGroup {
  slug: GroupSlug;
  label: string;
  // A category is part of this group if its slug contains ANY of these substrings.
  matchSlugs: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { slug: "mundu", label: "Mundu", matchSlugs: ["mundu", "dhoti"] },
  { slug: "saree", label: "Saree", matchSlugs: ["saree", "set-sarees"] },
  { slug: "shirt", label: "Shirt", matchSlugs: ["shirt"] },
];

export function getGroupBySlug(slug: string): CategoryGroup | undefined {
  return CATEGORY_GROUPS.find((g) => g.slug === slug);
}

export function categoryBelongsToGroup(categorySlug: string, groupSlug: GroupSlug): boolean {
  const group = getGroupBySlug(groupSlug);
  if (!group) return false;
  const cs = categorySlug.toLowerCase();
  return group.matchSlugs.some((m) => cs.includes(m.toLowerCase()));
}

export function groupForCategorySlug(categorySlug: string): CategoryGroup | undefined {
  const cs = categorySlug.toLowerCase();
  return CATEGORY_GROUPS.find((g) => g.matchSlugs.some((m) => cs.includes(m.toLowerCase())));
}
