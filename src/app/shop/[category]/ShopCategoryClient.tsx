"use client";

import { ShopBrowser } from "@/components/shop/ShopBrowser";

export default function ShopCategoryClient({ slug }: { slug: string }) {
  return <ShopBrowser categorySlug={slug} />;
}
