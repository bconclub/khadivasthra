"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ProductCard } from "@/components/product/ProductCard";
import { SiteBanner } from "@/components/SiteBanner";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/categories";
import type { ProductWithCategory } from "@/types";
import { categoryBelongsToGroup, type GroupSlug } from "@/lib/category-groups";
import { ArrowUpDown, Loader2, Check } from "lucide-react";

type SortKey = "price-asc" | "price-desc" | "newest" | null;

const SORT_OPTIONS: { value: SortKey; label: string; shortLabel: string }[] = [
  { value: null, label: "Featured", shortLabel: "Featured" },
  { value: "price-asc", label: "Price: Low to High", shortLabel: "Price: Low → High" },
  { value: "price-desc", label: "Price: High to Low", shortLabel: "Price: High → Low" },
  { value: "newest", label: "Newest First", shortLabel: "Newest First" },
];

function toCardProduct(product: ProductWithCategory) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    compare_price: product.compare_price ? Number(product.compare_price) : null,
    in_stock: product.in_stock,
    image: product.image_url || '',
    category: product.category?.name || '',
  };
}

/**
 * Single shop browsing surface used by both /shop and /shop/[category].
 * The active category lives in the URL (not local state), so browsing into a
 * product and pressing back returns to the same category.
 */
export function ShopBrowser({
  categorySlug = null,
  groupSlug = null,
}: {
  categorySlug?: string | null;
  groupSlug?: GroupSlug | null;
}) {
  const router = useRouter();
  const { data: products, loading: loadingProducts } = useSupabaseQuery(getProducts);
  const { data: categories } = useSupabaseQuery(getCategories);
  const [sortBy, setSortBy] = useState<SortKey>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollDelta = useRef(0);
  const activePillRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      if ((delta > 0 && scrollDelta.current > 0) || (delta < 0 && scrollDelta.current < 0)) {
        scrollDelta.current += delta;
      } else {
        scrollDelta.current = delta;
      }
      // Mirrors <Header>: visible at the top, hides on scroll down, returns up
      if (y <= 80) setHeaderVisible(true);
      else if (scrollDelta.current < -15) setHeaderVisible(true);
      else if (scrollDelta.current > 15) setHeaderVisible(false);
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const allProducts = products || [];

  // Categories that actually have products, most-stocked first. On a group
  // route only that group's categories are offered.
  const categoriesWithProducts = (categories || [])
    .filter(c => allProducts.some(p => p.category?.slug === c.slug))
    .filter(c => !groupSlug || categoryBelongsToGroup(c.slug, groupSlug))
    .sort((a, b) => {
      const countA = allProducts.filter(p => p.category?.slug === a.slug).length;
      const countB = allProducts.filter(p => p.category?.slug === b.slug).length;
      return countB - countA;
    });

  const activeCategory = categorySlug
    ? (categories || []).find(c => c.slug === categorySlug) || null
    : null;

  // "All" returns to the group root when browsing a group, else to /shop
  const rootHref = groupSlug ? `/shop/group/${groupSlug}` : "/shop";
  const goToCategory = (slug: string | null) => {
    router.push(slug ? `/shop/${slug}` : rootHref);
  };

  // Bring the selected category pill into view (centred) so it's never cut off
  // at the edge of the strip. Runs once the pills have actually rendered.
  const pillCount = categoriesWithProducts.length;
  useEffect(() => {
    activePillRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [categorySlug, pillCount]);

  const groupCategorySlugs = new Set(categoriesWithProducts.map(c => c.slug));
  // Everything in scope for this route — the whole catalogue, or just the
  // group's categories. Drives the "All" pill count.
  const scopeProducts = groupSlug
    ? allProducts.filter((p) => p.category?.slug && groupCategorySlugs.has(p.category.slug))
    : allProducts;
  const filteredProducts = categorySlug
    ? allProducts.filter((p) => p.category?.slug === categorySlug)
    : scopeProducts;

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") return Number(a.price) - Number(b.price);
    if (sortBy === "price-desc") return Number(b.price) - Number(a.price);
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    const scoreA = (a.is_best_seller ? 2 : 0) + (a.is_featured ? 1 : 0);
    const scoreB = (b.is_best_seller ? 2 : 0) + (b.is_featured ? 1 : 0);
    return scoreB - scoreA;
  });

  if (loadingProducts) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="shop-page min-h-screen bg-cream pt-4">
      {/* Header only for a specific category — "All" views show just the pills */}
      {activeCategory && (
        <div className="container mx-auto px-4 max-w-7xl pt-2">
          <div className="flex items-stretch gap-4">
            {activeCategory.image_url && (
              <div className="relative w-24 h-28 md:w-36 md:h-40 rounded-xl overflow-hidden flex-shrink-0 bg-white/60">
                <Image
                  src={activeCategory.image_url}
                  alt={activeCategory.name}
                  fill
                  sizes="(max-width: 768px) 96px, 144px"
                  className="object-cover object-top"
                  unoptimized
                />
              </div>
            )}
            <div className="min-w-0 flex flex-col justify-center py-1">
              <h1 className="text-2xl md:text-4xl font-bold text-text font-serif">{activeCategory.name}</h1>
              {activeCategory.description && (
                <p className="text-text-muted text-sm md:text-base line-clamp-3 mt-1">{activeCategory.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 max-w-7xl py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-text mb-4">Categories</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => goToCategory(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      !categorySlug ? "bg-coral text-white" : "hover:bg-cream text-text"
                    }`}
                  >
                    All Products
                  </button>
                  {categoriesWithProducts.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => goToCategory(cat.slug)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        categorySlug === cat.slug ? "bg-coral text-white" : "hover:bg-cream text-text"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-text mb-4">Sort By</h3>
                <div className="space-y-2">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setSortBy(option.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        sortBy === option.value ? "bg-orange text-white" : "hover:bg-cream text-text"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Mobile Category Tags & Sort - sticky */}
            <div className={`lg:hidden sticky z-40 -mx-4 px-4 bg-cream border-b border-gray-200 transition-all duration-300 ${headerVisible ? 'top-16' : 'top-0'}`}>
              <div className="flex items-center gap-2 py-3">
                <div className="flex-1 overflow-x-auto scrollbar-hide -mx-1">
                  <div className="flex gap-2 px-1 w-max">
                    <button
                      onClick={() => goToCategory(null)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                        !categorySlug ? "bg-coral text-white shadow-sm" : "bg-white/80 text-text"
                      }`}
                    >
                      All <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ml-1 ${!categorySlug ? 'bg-white text-coral' : 'bg-gray-200 text-text-muted'}`}>{scopeProducts.length}</span>
                    </button>
                    {categoriesWithProducts.map((cat) => {
                      const count = allProducts.filter(p => p.category?.slug === cat.slug).length;
                      const isActive = categorySlug === cat.slug;
                      return (
                        <button
                          key={cat.id}
                          ref={isActive ? activePillRef : undefined}
                          onClick={() => goToCategory(cat.slug)}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                            isActive ? "bg-coral text-white shadow-sm" : "bg-white/80 text-text"
                          }`}
                        >
                          {cat.name} <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white text-coral' : 'bg-gray-200 text-text-muted'}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                      sortBy ? "bg-coral text-white" : "bg-white/80 text-text"
                    }`}
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                  {showSortMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[180px]">
                        {SORT_OPTIONS.map((option) => (
                          <button
                            key={option.label}
                            onClick={() => { setSortBy(option.value); setShowSortMenu(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-cream/50 transition-colors"
                          >
                            {option.shortLabel}
                            {sortBy === option.value && <Check className="w-4 h-4 text-coral" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Results Header - desktop only */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <p className="text-text-muted">
                Showing <span className="font-semibold text-text">{sortedProducts.length}</span> products
                {activeCategory && (
                  <span> in <span className="font-semibold text-coral">{activeCategory.name}</span></span>
                )}
              </p>
              <div className="hidden lg:flex items-center gap-2">
                <span className="text-sm text-text-muted">Sort by:</span>
                <select
                  className="appearance-none bg-white border border-gray-200 px-4 py-2 rounded-lg pr-10 cursor-pointer focus:ring-2 focus:ring-coral focus:border-transparent"
                  onChange={(e) => setSortBy(e.target.value === "" ? null : e.target.value as SortKey)}
                  value={sortBy || ""}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.label} value={o.value || ""}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Shop Banner (admin managed). On mobile it only shows on the
                "All" view — once a category is picked its header takes that
                space and the products pull up instead. */}
            <div className={`mb-6 ${categorySlug ? "hidden md:block" : ""}`}>
              <SiteBanner placement="shop" />
            </div>

            {/* Products Grid */}
            {sortedProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
                {sortedProducts.map((product) => (
                  <ProductCard key={product.id} product={toCardProduct(product)} variant="white" />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-xl">
                <p className="text-text-muted text-lg">No products found in this category.</p>
                <button onClick={() => goToCategory(null)} className="mt-4 text-coral hover:underline">
                  View all products
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
