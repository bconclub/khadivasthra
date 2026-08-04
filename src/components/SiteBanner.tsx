"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getActiveBanners } from "@/lib/services/admin";
import type { Banner, BannerPlacement } from "@/types";

function getBannerHref(banner: Banner): string | null {
  if (banner.link_type === "none" || !banner.link_value) return null;
  if (banner.link_type === "product") return `/product/${banner.link_value}`;
  if (banner.link_type === "category") return `/shop/${banner.link_value}`;
  return banner.link_value;
}

interface SiteBannerProps {
  placement: BannerPlacement;
  className?: string;
}

/**
 * Full-width, admin-managed banner strip. Rotates automatically when a
 * placement has more than one active banner. Desktop image is 2172x724 (3:1),
 * mobile image is 1448x1086 (4:3) - falls back to the desktop image if no
 * separate mobile image was uploaded.
 */
export function SiteBanner({ placement, className = "" }: SiteBannerProps) {
  const { data: banners } = useSupabaseQuery(() => getActiveBanners(placement), [placement]);
  const [index, setIndex] = useState(0);

  const items = banners || [];

  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  const banner = items[index];
  const href = getBannerHref(banner);

  const content = (
    <div className={`site-banner relative w-full aspect-[1448/1086] md:aspect-[2172/724] overflow-hidden rounded-2xl group ${className}`}>
      {/* Mobile image */}
      <Image
        src={banner.mobile_image_url || banner.image_url}
        alt={banner.title}
        fill
        className="object-cover md:hidden group-hover:scale-105 transition-transform duration-500"
        unoptimized
        priority={placement === "homepage_hero"}
      />
      {/* Desktop image */}
      <Image
        src={banner.image_url}
        alt={banner.title}
        fill
        className="object-cover hidden md:block group-hover:scale-105 transition-transform duration-500"
        unoptimized
        priority={placement === "homepage_hero"}
      />
      {(banner.title || banner.subtitle) && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
            <h3 className="text-xl md:text-3xl font-bold text-white drop-shadow-md font-serif">{banner.title}</h3>
            {banner.subtitle && (
              <p className="text-white/85 text-sm md:text-base mt-1 drop-shadow-sm">{banner.subtitle}</p>
            )}
          </div>
        </>
      )}
      {items.length > 1 && (
        <div className="absolute bottom-3 right-3 md:bottom-5 md:right-5 flex gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setIndex(i);
              }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? "bg-white w-4" : "bg-white/50"}`}
              aria-label={`Show banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
