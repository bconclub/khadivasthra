// Top-level groupings shown on the home page.
// Each group is matched against category slugs by substring(s) — so "kavi-mundu",
// "kavi-mundus", "printed-mundu", etc. all fall under the "mundu" group automatically.
//
// SLUG_OVERRIDES handles exceptions: a category like "set-mundu" contains "mundu"
// but is actually a women's saree-style outfit, so it's force-mapped to "saree".

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

// Exact-slug overrides for categories whose substring would match the wrong group.
// Add a row here whenever you have a category that should not follow the substring rule.
const SLUG_OVERRIDES: Record<string, GroupSlug> = {
  "set-mundu": "saree",
  "set-mundus": "saree",
  "settu-mundu": "saree",
  "settu-mundus": "saree",
};

export function getGroupBySlug(slug: string): CategoryGroup | undefined {
  return CATEGORY_GROUPS.find((g) => g.slug === slug);
}

export function categoryBelongsToGroup(categorySlug: string, groupSlug: GroupSlug): boolean {
  const cs = categorySlug.toLowerCase();
  // Override wins over substring rules
  const override = SLUG_OVERRIDES[cs];
  if (override !== undefined) return override === groupSlug;

  const group = getGroupBySlug(groupSlug);
  if (!group) return false;
  return group.matchSlugs.some((m) => cs.includes(m.toLowerCase()));
}

export function groupForCategorySlug(categorySlug: string): CategoryGroup | undefined {
  const cs = categorySlug.toLowerCase();
  const override = SLUG_OVERRIDES[cs];
  if (override) return getGroupBySlug(override);
  return CATEGORY_GROUPS.find((g) => g.matchSlugs.some((m) => cs.includes(m.toLowerCase())));
}
