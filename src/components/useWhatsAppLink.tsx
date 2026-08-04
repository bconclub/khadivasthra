"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getSettings } from "@/lib/services/settings";
import { getProductBySlug } from "@/lib/services/products";
import { getCategoryBySlug } from "@/lib/services/categories";
import { getGroupBySlug } from "@/lib/category-groups";

const DEFAULT_NUMBER = "918714090510";
const SITE_URL = "https://khadivasthra.com";

/**
 * Builds a wa.me link whose opening message reflects whatever the shopper is
 * looking at — a product, a category, a collection, or a plain hello.
 */
export function useWhatsAppLink(): string {
  const pathname = usePathname();
  const [number, setNumber] = useState(DEFAULT_NUMBER);
  const [message, setMessage] = useState("Hi! I'd like to know more about your products.");

  useEffect(() => {
    getSettings()
      .then((s) => { if (s?.whatsapp_number) setNumber(s.whatsapp_number.replace(/\D/g, "")); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const segments = (pathname || "/").split("/").filter(Boolean);

    const build = async () => {
      // /product/<slug>
      if (segments[0] === "product" && segments[1]) {
        try {
          const p = await getProductBySlug(segments[1]);
          if (cancelled) return;
          if (p) {
            setMessage(
              `Hi! I'd like to order this:\n\n*${p.name}*\n₹${Number(p.price).toLocaleString()}\n${SITE_URL}/product/${p.slug}`
            );
            return;
          }
        } catch { /* fall through to default */ }
      }

      // /shop/group/<group>
      if (segments[0] === "shop" && segments[1] === "group" && segments[2]) {
        const group = getGroupBySlug(segments[2]);
        if (cancelled) return;
        if (group) {
          setMessage(`Hi! I'd like to see your *${group.label}* collection.\n${SITE_URL}/shop/group/${group.slug}`);
          return;
        }
      }

      // /shop/<category>
      if (segments[0] === "shop" && segments[1]) {
        try {
          const c = await getCategoryBySlug(segments[1]);
          if (cancelled) return;
          if (c) {
            setMessage(`Hi! I'd like to see what you have in *${c.name}*.\n${SITE_URL}/shop/${c.slug}`);
            return;
          }
        } catch { /* fall through to default */ }
      }

      if (cancelled) return;
      setMessage("Hi! I'd like to know more about your products.");
    };

    build();
    return () => { cancelled = true; };
  }, [pathname]);

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
