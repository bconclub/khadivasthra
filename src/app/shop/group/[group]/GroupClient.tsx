"use client";

import { ShopBrowser } from "@/components/shop/ShopBrowser";
import type { GroupSlug } from "@/lib/category-groups";

export default function GroupClient({ group }: { group: GroupSlug }) {
  return <ShopBrowser groupSlug={group} />;
}
