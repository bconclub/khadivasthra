"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Every route change starts at the top of the page. Without this, navigating
 * from a scrolled homepage into a category landed the shopper deep in the
 * page (often at the footer), because the browser kept the old scroll offset.
 *
 * `behavior: "instant"` matters — `html { scroll-behavior: smooth }` would
 * otherwise animate the jump, which reads as the page sliding around.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
