"use client";

import { LookBrowser } from "@/components/shop/LookBrowser";

export default function LookClient({ slug }: { slug: string }) {
  return <LookBrowser slug={slug} />;
}
