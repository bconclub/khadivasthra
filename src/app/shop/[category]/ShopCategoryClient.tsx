"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getProductsByCategorySlug } from "@/lib/services/products";
import { getCategoryBySlug } from "@/lib/services/categories";
import type { ProductWithCategory } from "@/types";
import { ArrowUpDown, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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

export default function ShopCategoryClient({ slug }: { slug: string }) {
  const { data: category, loading: loadingCategory } = useSupabaseQuery(
    () => getCategoryBySlug(slug), [slug]
  );
  const { data: products, loading: loadingProducts } = useSupabaseQuery(
    () => getProductsByCategorySlug(slug), [slug]
  );
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | null>(null);

  if (loadingCategory || loadingProducts) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text mb-4">Category Not Found</h1>
          <p className="text-text-muted mb-6">
            We couldn&apos;t find the category you&apos;re looking for.
          </p>
          <Link href="/shop" className="inline-flex items-center gap-2 text-coral hover:underline">
            <ChevronLeft className="w-4 h-4" />
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const allProducts = products || [];
  const sortedProducts = [...allProducts].sort((a, b) => {
    if (sortBy === "price-asc") return Number(a.price) - Number(b.price);
    if (sortBy === "price-desc") return Number(b.price) - Number(a.price);
    return 0;
  });

  return (
    <div className="shop-category-page min-h-screen bg-cream">
      {category.image_url ? (
        <div className="relative h-48 md:h-72 overflow-hidden">
          <Image
            src={category.image_url}
            alt={category.name}
            fill
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
          <div className="absolute inset-0 flex flex-col justify-end">
            <div className="container mx-auto px-4 max-w-7xl pb-8">
              <Link href="/shop" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-3 text-sm">
                <ChevronLeft className="w-4 h-4" />
                Back to Shop
              </Link>
              <h1 className="text-3xl md:text-5xl font-bold text-white font-serif mb-2">
                {category.name}
              </h1>
              <p className="text-white/80 text-base md:text-lg max-w-2xl">
                {category.description || `Browse our collection of ${category.name.toLowerCase()}. Each piece is handcrafted by skilled artisans of Kerala.`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-coral/10 py-12">
          <div className="container mx-auto px-4 max-w-7xl">
            <Link href="/shop" className="inline-flex items-center gap-2 text-coral hover:underline mb-4">
              <ChevronLeft className="w-4 h-4" />
              Back to Shop
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold text-text font-serif mb-4">
              {category.name}
            </h1>
            <p className="text-text-muted text-lg max-w-2xl">
              {category.description || `Browse our collection of ${category.name.toLowerCase()}. Each piece is handcrafted by skilled artisans of Kerala.`}
            </p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 max-w-7xl py-8">
        {/* Sort bar - sticky on mobile */}
        <div className="sticky top-0 z-40 -mx-4 px-4 py-3 md:static md:mx-0 md:px-0 md:py-0 bg-cream/80 backdrop-blur-lg md:bg-transparent md:backdrop-blur-none border-b border-white/40 md:border-0 flex items-center justify-between mb-6">
          <p className="text-text-muted text-sm md:text-base">
            Showing <span className="font-semibold text-text">{sortedProducts.length}</span> products
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
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={toCardProduct(product)} variant="white" />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl">
            <p className="text-text-muted text-lg">No products found in this category.</p>
            <Link href="/shop" className="mt-4 text-coral hover:underline inline-block">
              View all products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
