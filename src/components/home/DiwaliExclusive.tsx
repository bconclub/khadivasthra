"use client";

import Link from "next/link";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { storageImage, IMG } from "@/lib/image";
import type { Category, ProductWithCategory } from "@/types";

// Festive palette, kept local to this section so the rest of the site keeps
// its coral and cream.
const MAROON = "#5A0E1E";
const MAROON_LIGHT = "#7D1A2E";
const GOLD = "#E9C46A";

const PICK_COUNT = 8;
const TAGLINES = ["The festive classic", "Life of the party", "The showstopper", "The minimalist", "Light it up", "Pooja-ready", "Family favourite", "Effortless ethnic"];

function discountOf(p: ProductWithCategory): number {
  const price = Number(p.price);
  const mrp = Number(p.compare_price);
  return mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
}

/** Most-discounted in-stock products first, topped up with other in-stock ones. */
function pickProducts(products: ProductWithCategory[]): ProductWithCategory[] {
  const available = products.filter((p) => p.in_stock && (p.stock_quantity ?? 0) > 0 && p.image_url);
  const discounted = available.filter((p) => discountOf(p) > 0).sort((a, b) => discountOf(b) - discountOf(a));
  if (discounted.length >= PICK_COUNT) return discounted.slice(0, PICK_COUNT);
  const chosen = new Set(discounted.map((p) => p.id));
  return [...discounted, ...available.filter((p) => !chosen.has(p.id))].slice(0, PICK_COUNT);
}

function Diya({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" className={className} aria-hidden="true">
      <path d="M32 4c4 6 5 10 0 16-5-6-4-10 0-16z" fill="#FFB938" />
      <path d="M32 9c2 3 2 6 0 9-2-3-2-6 0-9z" fill="#FFF1B8" />
      <path d="M6 26h52c-2 11-12 18-26 18S8 37 6 26z" fill={GOLD} />
      <path d="M12 30h40" stroke={MAROON} strokeWidth="2" strokeDasharray="3 4" />
    </svg>
  );
}

function Lights() {
  return (
    <div className="absolute inset-x-0 top-0 flex justify-around pointer-events-none" aria-hidden="true">
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} className="flex flex-col items-center">
          <span className="block w-px h-3 md:h-5" style={{ background: `${GOLD}88` }} />
          <span
            className="block w-2 h-2 md:w-2.5 md:h-2.5 rounded-full animate-pulse"
            style={{ background: i % 2 ? "#FFB938" : "#FFF1B8", boxShadow: "0 0 8px #FFB938", animationDelay: `${(i % 4) * 0.4}s` }}
          />
        </span>
      ))}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center mb-6 md:mb-8">
      <div className="flex items-center justify-center gap-3">
        <Diya className="w-8 h-6 md:w-10 md:h-8" />
        <h2 className="font-serif font-bold tracking-[0.12em] text-2xl md:text-4xl" style={{ color: GOLD }}>
          {title}
        </h2>
        <Diya className="w-8 h-6 md:w-10 md:h-8" />
      </div>
      <p className="mt-1 text-sm md:text-base text-white/75">{subtitle}</p>
    </div>
  );
}

function ExclusiveTile({ product }: { product: ProductWithCategory }) {
  const off = discountOf(product);
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col rounded-xl overflow-hidden bg-white shadow-lg shadow-black/30 ring-1 ring-white/10 hover:-translate-y-1 transition-transform duration-300"
    >
      <div className="relative aspect-square bg-cream/60">
        <Image
          src={storageImage(product.image_url, IMG.card)}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 16vw"
          className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
          unoptimized
        />
      </div>
      <div className="px-2 py-2 text-center" style={{ background: MAROON_LIGHT }}>
        <p className="text-[11px] md:text-xs text-white/80 line-clamp-1">{product.name}</p>
        <p className="text-xs md:text-sm font-bold" style={{ color: GOLD }}>
          {off > 0 ? `${off}% OFF` : `Now ₹${Number(product.price).toLocaleString("en-IN")}`}
        </p>
      </div>
    </Link>
  );
}

function GuestCard({ category, tagline }: { category: Category; tagline: string }) {
  return (
    <Link href={`/shop/${category.slug}`} className="group block">
      <div className="rounded-t-[999px] rounded-b-xl p-1.5 md:p-2 shadow-xl shadow-black/30" style={{ background: GOLD }}>
        <div className="relative aspect-[3/4] rounded-t-[999px] rounded-b-lg overflow-hidden bg-cream">
          {category.image_url ? (
            <Image
              src={storageImage(category.image_url, IMG.card)}
              alt={category.name}
              fill
              sizes="(max-width: 768px) 45vw, 20vw"
              className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageOff className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>
        <div className="py-2 text-center">
          <p className="font-serif font-bold text-sm md:text-base leading-tight" style={{ color: MAROON }}>{category.name}</p>
          <p className="text-[11px] md:text-xs" style={{ color: `${MAROON}cc` }}>{tagline}</p>
        </div>
      </div>
    </Link>
  );
}

function GuestList({ categories }: { categories: Category[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", dragFree: true });
  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 md:gap-6">
          {categories.map((c, i) => (
            <div key={c.id} className="flex-[0_0_44%] sm:flex-[0_0_30%] lg:flex-[0_0_20%] min-w-0">
              <GuestCard category={c} tagline={TAGLINES[i % TAGLINES.length]} />
            </div>
          ))}
        </div>
      </div>
      {categories.length > 4 && (
        <div className="hidden md:flex justify-center gap-3 mt-6">
          <button type="button" onClick={() => emblaApi?.scrollPrev()} aria-label="Previous" className="w-10 h-10 rounded-full flex items-center justify-center border-2 hover:bg-white/10" style={{ borderColor: GOLD, color: GOLD }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => emblaApi?.scrollNext()} aria-label="Next" className="w-10 h-10 rounded-full flex items-center justify-center border-2 hover:bg-white/10" style={{ borderColor: GOLD, color: GOLD }}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Festive homepage block: a "Diwali Exclusive" grid of the best deals and a
 * "Diwali Guest List" carousel of categories in arch frames. Switched on and
 * off from Admin → Settings; picks products automatically from what is
 * discounted and in stock, so there is nothing else to curate.
 */
export function DiwaliExclusive({ products, categories }: { products: ProductWithCategory[]; categories: Category[] }) {
  const picks = pickProducts(products);
  const bestOff = picks.reduce((m, p) => Math.max(m, discountOf(p)), 0);
  const guests = categories.filter((c) => c.is_active !== false);
  if (picks.length === 0 && guests.length === 0) return null;

  return (
    <section
      className="diwali-section relative overflow-hidden py-12 md:py-16"
      style={{ background: `radial-gradient(ellipse at top, ${MAROON_LIGHT} 0%, ${MAROON} 55%, #3A0812 100%)` }}
    >
      <Lights />
      <div className="container relative mx-auto px-4 max-w-7xl">
        {picks.length > 0 && (
          <>
            <SectionTitle
              title="DIWALI EXCLUSIVE"
              subtitle={bestOff > 0 ? `Festive picks, up to ${bestOff}% off` : "Festive picks for the season of lights"}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 max-w-5xl mx-auto">
              {picks.map((p) => <ExclusiveTile key={p.id} product={p} />)}
            </div>
            <div className="flex justify-center mt-6">
              <Link
                href="/offers"
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ background: GOLD, color: MAROON }}
              >
                View all offers <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}

        {guests.length > 0 && (
          <div className={picks.length > 0 ? "mt-14 md:mt-16" : ""}>
            <SectionTitle title="THE DIWALI GUEST LIST" subtitle="Meet the looks making the guest list" />
            <GuestList categories={guests} />
          </div>
        )}
      </div>
    </section>
  );
}
