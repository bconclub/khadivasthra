"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { supabase } from "@/lib/supabase";
import type { ProductWithCategory } from "@/types";
import { ArrowUpDown, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";

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

interface GroupCategory {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  groupLabel: string;
  groupSlug: string;
  categories: GroupCategory[];
}

async function fetchProductsInCategories(categoryIds: string[]): Promise<ProductWithCategory[]> {
  if (categoryIds.length === 0) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .eq("is_active", true)
    .in("category_id", categoryIds)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

export default function GroupClient({ groupLabel, groupSlug, categories }: Props) {
  const categoryIds = categories.map((c) => c.id);
  const { data: products, loading } = useSupabaseQuery(
    () => fetchProductsInCategories(categoryIds),
    [categoryIds.join(",")]
  );
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "newest" | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  const allProducts = products || [];

  // Apply sub-category filter
  const filteredProducts = selectedSubCategory
    ? allProducts.filter((p) => p.category_id === selectedSubCategory)
    : allProducts;

  // Sort
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") return Number(a.price) - Number(b.price);
    if (sortBy === "price-desc") return Number(b.price) - Number(a.price);
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    const scoreA = (a.is_best_seller ? 2 : 0) + (a.is_featured ? 1 : 0);
    const scoreB = (b.is_best_seller ? 2 : 0) + (b.is_featured ? 1 : 0);
    return scoreB - scoreA;
  });

  // Count products per sub-category for chip badges
  const countForCategory = (categoryId: string) =>
    allProducts.filter((p) => p.category_id === categoryId).length;

  return (
    <div className="shop-group-page min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-coral/10 py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <Link href="/" className="inline-flex items-center gap-2 text-coral hover:underline mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-text font-serif mb-3">
            {groupLabel} Collection
          </h1>
          <p className="text-text-muted text-lg max-w-2xl">
            Browse our complete {groupLabel.toLowerCase()} range — authentic Kerala handloom, crafted with traditional artistry.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-6">
        {/* Sub-category chips — only show if there's more than one sub-category */}
        {categories.length > 1 && (
          <div className="mb-6 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 w-max md:flex-wrap md:w-auto">
              <button
                onClick={() => setSelectedSubCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  !selectedSubCategory
                    ? "bg-coral text-white shadow-sm"
                    : "bg-white text-text border border-gray-200 hover:bg-gray-50"
                }`}
              >
                All
                <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                  !selectedSubCategory ? "bg-white/20 text-white" : "bg-gray-100 text-text-muted"
                }`}>
                  {allProducts.length}
                </span>
              </button>
              {categories.map((cat) => {
                const count = countForCategory(cat.id);
                if (count === 0) return null;
                const isActive = selectedSubCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedSubCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? "bg-coral text-white shadow-sm"
                        : "bg-white text-text border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {cat.name}
                    <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-gray-100 text-text-muted"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sort bar */}
        <div className="sticky top-0 z-40 -mx-4 px-4 py-3 md:static md:mx-0 md:px-0 md:py-0 bg-cream/80 backdrop-blur-lg md:bg-transparent md:backdrop-blur-none border-b border-white/40 md:border-0 flex items-center justify-between mb-6">
          <p className="text-text-muted text-sm md:text-base">
            Showing <span className="font-semibold text-text">{sortedProducts.length}</span> {groupLabel.toLowerCase()}{sortedProducts.length === 1 ? "" : "s"}
            {selectedSubCategory && (
              <> in <span className="font-semibold text-coral">{categories.find((c) => c.id === selectedSubCategory)?.name}</span></>
            )}
          </p>
          <div className="relative">
            <select
              className="appearance-none bg-white/70 backdrop-blur-sm md:bg-white border border-white/50 md:border-gray-200 px-4 py-2 rounded-xl md:rounded-lg pr-10 cursor-pointer focus:ring-2 focus:ring-coral focus:border-transparent text-sm font-medium"
              onChange={(e) => setSortBy(e.target.value === "" ? null : (e.target.value as typeof sortBy))}
              value={sortBy || ""}
            >
              <option value="">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Product grid */}
        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={toCardProduct(product)} variant="white" />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl">
            <p className="text-text-muted text-lg">
              No {groupLabel.toLowerCase()} products{selectedSubCategory ? ` in ${categories.find((c) => c.id === selectedSubCategory)?.name}` : ""}.
            </p>
            <button
              onClick={() => setSelectedSubCategory(null)}
              className="mt-4 text-coral hover:underline inline-block"
            >
              View all {groupLabel.toLowerCase()}s →
            </button>
          </div>
        )}
      </div>

      {/* Hidden div to keep groupSlug useful (for future analytics / similar) */}
      <span data-group={groupSlug} className="hidden" />
    </div>
  );
}
