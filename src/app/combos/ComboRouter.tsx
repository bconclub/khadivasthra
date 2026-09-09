"use client";

import { useSearchParams } from "next/navigation";
import CombosIndexClient from "./CombosIndexClient";
import ComboClient from "./[slug]/ComboClient";

/** A single exported page can open combos added after the last deployment. */
export default function ComboRouter() {
  const slug = useSearchParams().get("combo");
  return slug ? <ComboClient key={slug} slug={slug} /> : <CombosIndexClient />;
}
