"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/product/ProductCard";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getLookBySlug, getLooks } from "@/lib/services/looks";
import { storageImage, IMG } from "@/lib/image";
import type { Look, ProductWithCategory } from "@/types";
import { Loader2, ArrowUpDown, Check, ChevronLeft } from "lucide-react";

type SortKey = "price-asc" | "price-desc" | null;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: null, label: "Curated order" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

function toCardProduct(product: ProductWithCategory) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    compare_price: product.compare_price ? Number(product.compare_price) : null,
    in_stock: product.in_stock,
    image: product.image_url || "",
    category: product.category?.name || "",
  };
}

/**
 * A single look: the styled photo, everything in it, and other looks below.
 * Browsing behaves like the shop, but the set is curated rather than derived
 * from a category.
 */
export function LookBrowser({ slug }: { slug: string }) {
  const { data: look, loading } = useSupabaseQuery(() => getLookBySlug(slug), [slug]);
  const { data: allLooks } = useSupabaseQuery(getLooks);
  const [sortBy, setSortBy] = useState<SortKey>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  if (!look) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text mb-3">Look not found</h1>
          <p className="text-text-muted mb-6">This look may have been removed.</p>
          <Link href="/looks" className="inline-flex items-center gap-2 text-coral hover:underline">
            <ChevronLeft className="w-4 h-4" /> Browse all looks
          </Link>
        </div>
      </div>
    );
  }

  const products = look.products || [];
  const sorted = [...products].sort((a, b) => {
    if (sortBy === "price-asc") return Number(a.price) - Number(b.price);
    if (sortBy === "price-desc") return Number(b.price) - Number(a.price);
    return 0; // curated order comes from the admin
  });

  const otherLooks = (allLooks || []).filter((l) => l.id !== look.id);

  return (
    <div className="look-page min-h-screen bg-cream">
      {/* The look itself */}
      <div className="container mx-auto px-4 max-w-7xl pt-4 pb-8">
        <Link
          href="/looks"
          className="inline-flex items-center gap-1 text-coral hover:underline text-sm mb-3"
        >
          <ChevronLeft className="w-4 h-4" /> All looks
        </Link>

        <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center">
          <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-lg bg-white/50">
            <Image
              src={storageImage(look.mobile_image_url || look.image_url, IMG.card)}
              alt={look.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover md:hidden"
              priority
              unoptimized
            />
            <Image
              src={storageImage(look.image_url, IMG.hero)}
              alt={look.name}
              fill
              sizes="50vw"
              className="object-cover hidden md:block"
              priority
              unoptimized
            />
          </div>

          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-coral/10 text-coral text-xs font-semibold uppercase tracking-wider mb-3">
              Shop the Look
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-text font-serif mb-3">{look.name}</h1>
            {look.description && (
              <p className="text-text-muted text-base md:text-lg leading-relaxed mb-4">
                {look.description}
              </p>
            )}
            <p className="text-sm text-text-muted">
              <span className="font-semibold text-text">{products.length}</span>{" "}
              {products.length === 1 ? "piece" : "pieces"} in this look
            </p>
          </div>
        </div>
      </div>

      {/* Everything in the look */}
      <div className="container mx-auto px-4 max-w-7xl pb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-bold text-text font-serif">In this look</h2>
          {products.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-sm font-medium text-text shadow-sm"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                </span>
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[190px]">
                    {SORT_OPTIONS.map((o) => (
                      <button
                        key={o.label}
                        onClick={() => {
                          setSortBy(o.value);
                          setShowSortMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-cream/50"
                      >
                        {o.label}
                        {sortBy === o.value && <Check className="w-4 h-4 text-coral" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {sorted.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
            {sorted.map((product) => (
              <ProductCard key={product.id} product={toCardProduct(product)} variant="white" />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl">
            <p className="text-text-muted">Nothing has been added to this look yet.</p>
          </div>
        )}
      </div>

      {/* Other looks */}
      {otherLooks.length > 0 && (
        <div className="bg-white py-12">
          <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-2xl md:text-3xl font-bold text-text font-serif text-center mb-8">
              Other looks you might like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {otherLooks.slice(0, 8).map((other) => (
                <LookCard key={other.id} look={other} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Shared card used on the look page and the homepage strip. */
export function LookCard({ look }: { look: Look }) {
  return (
    <Link href={`/looks/${look.slug}`} className="group block">
      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-md bg-cream/50">
        <Image
          src={storageImage(look.image_url, IMG.card)}
          alt={look.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover [@media(hover:hover)]:group-hover:scale-105 transition-transform duration-500"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
          <h3 className="text-white font-bold text-sm md:text-lg leading-tight drop-shadow-md">
            {look.name}
          </h3>
          <span className="inline-flex items-center gap-1 mt-1.5 text-white text-[11px] md:text-xs font-medium bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
            Shop the Look
          </span>
        </div>
      </div>
    </Link>
  );
}
