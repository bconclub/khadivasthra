"use client";

import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getActiveBanners } from "@/lib/services/admin";
import { getProducts } from "@/lib/services/products";
import type { Banner, ProductWithCategory } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ArrowRight, Tag, Sparkles } from "lucide-react";

function getBannerLink(banner: Banner): string | null {
  if (banner.link_type === "none" || !banner.link_value) return null;
  if (banner.link_type === "product") return `/product/${banner.link_value}`;
  if (banner.link_type === "category") return `/shop/${banner.link_value}`;
  return banner.link_value;
}

function getBannerAspect(size: string): string {
  switch (size) {
    case "hero": return "aspect-video";
    case "wide": return "aspect-[3/1]";
    case "square": return "aspect-square";
    case "tall": return "aspect-[2/3]";
    default: return "aspect-video";
  }
}

function BannerCard({ banner }: { banner: Banner }) {
  const link = getBannerLink(banner);
  const aspect = getBannerAspect(banner.size);

  const content = (
    <div className={`group relative ${aspect} w-full rounded-2xl overflow-hidden bg-cream/50 shadow-sm hover:shadow-lg transition-all duration-300`}>
      <Image
        src={banner.image_url}
        alt={banner.title}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-500"
        unoptimized
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      {/* Text content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
        <h3 className="text-white font-bold text-lg md:text-xl leading-tight drop-shadow-md">
          {banner.title}
        </h3>
        {banner.subtitle && (
          <p className="text-white/80 text-sm mt-1 drop-shadow-sm">{banner.subtitle}</p>
        )}
        {link && (
          <span className="inline-flex items-center gap-1 mt-3 text-white text-sm font-medium bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full group-hover:bg-white/30 transition-colors">
            Shop Now <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        )}
      </div>
    </div>
  );

  if (link) {
    return (
      <Link href={link} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

export default function OffersPage() {
  const { data: banners, loading: loadingBanners } = useSupabaseQuery(getActiveBanners);
  const { data: products, loading: loadingProducts } = useSupabaseQuery(getProducts);

  const activeBanners = banners || [];
  const allProducts = products || [];

  // Products with discounts
  const discountedProducts = allProducts.filter(
    (p) => p.compare_price && p.compare_price > p.price && p.in_stock
  );

  if (loadingBanners && loadingProducts) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  // Separate hero banners from others
  const heroBanners = activeBanners.filter((b) => b.size === "hero");
  const otherBanners = activeBanners.filter((b) => b.size !== "hero");

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 max-w-7xl py-6 md:py-10">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-coral/10 text-coral px-4 py-1.5 rounded-full text-sm font-medium mb-3">
            <Sparkles className="w-4 h-4" />
            Offers & Promotions
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text font-serif">
            Special Offers
          </h1>
          <p className="text-text-muted mt-2 max-w-md mx-auto">
            Discover our latest deals and promotions on authentic Kerala handloom mundus
          </p>
        </div>

        {/* Hero Banners - Full Width */}
        {heroBanners.length > 0 && (
          <div className="space-y-4 mb-8">
            {heroBanners.map((banner) => (
              <BannerCard key={banner.id} banner={banner} />
            ))}
          </div>
        )}

        {/* Other Banners - Grid Layout */}
        {otherBanners.length > 0 && (
          <div className="mb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherBanners.map((banner) => {
                // Wide banners span 2 columns
                const spanClass = banner.size === "wide" ? "md:col-span-2" : "";
                return (
                  <div key={banner.id} className={spanClass}>
                    <BannerCard banner={banner} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Banners */}
        {activeBanners.length === 0 && discountedProducts.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No offers right now</h3>
            <p className="text-gray-500 mb-4">Check back soon for special deals!</p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-coral font-medium hover:underline"
            >
              Browse all products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Discounted Products */}
        {discountedProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-text font-serif">
                  Products on Sale
                </h2>
                <p className="text-text-muted text-sm mt-1">
                  {discountedProducts.length} products with special pricing
                </p>
              </div>
              <Link
                href="/shop"
                className="text-coral text-sm font-medium hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {discountedProducts.slice(0, 8).map((product) => (
                <DiscountProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DiscountProductCard({ product }: { product: ProductWithCategory }) {
  const discountPercent = product.compare_price
    ? Math.round(((Number(product.compare_price) - Number(product.price)) / Number(product.compare_price)) * 100)
    : 0;

  const imageUrl = product.image_url && (product.image_url.startsWith("/images/") || product.image_url.startsWith("https://"))
    ? product.image_url
    : `https://placehold.co/600x800/E8657B/FFF?text=${encodeURIComponent(product.name.replace(/ /g, "+"))}`;

  const categoryName = typeof product.category === "object" && product.category
    ? Array.isArray(product.category) ? product.category[0]?.name : product.category.name
    : "";

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
        <div className="relative aspect-[3/4] bg-cream/30">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 25vw"
            unoptimized
          />
          {discountPercent > 0 && (
            <span className="absolute top-3 left-3 bg-coral text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
              {discountPercent}% OFF
            </span>
          )}
        </div>
        <div className="p-3">
          {categoryName && (
            <p className="text-[10px] text-text-muted font-medium tracking-widest uppercase mb-0.5">
              {categoryName}
            </p>
          )}
          <h3 className="font-semibold text-sm text-text leading-snug line-clamp-1">{product.name}</h3>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="font-bold text-base text-orange">₹{product.price}</span>
            {product.compare_price && (
              <span className="text-xs text-text-muted line-through">₹{product.compare_price}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
