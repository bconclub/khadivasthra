"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import products from "@/data/products.json";
import { ArrowUpDown, ChevronLeft } from "lucide-react";
import Link from "next/link";

function slugify(text: string) {
  return text.toLowerCase().replace(/ /g, "-").replace(/\./g, "");
}

// Map slugs back to category names
const getCategoryFromSlug = (slug: string) => {
  const categories = Array.from(new Set(products.map((p) => p.category)));
  return categories.find((c) => slugify(c) === slug);
};

export default function ShopCategoryClient({ slug }: { slug: string }) {
  const categoryName = getCategoryFromSlug(slug);
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | null>(null);

  if (!categoryName) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text mb-4">Category Not Found</h1>
          <p className="text-text-muted mb-6">
            We couldn't find the category you're looking for.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-coral hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter((p) => p.category === categoryName);

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    return 0;
  });

  return (
    <div className="shop-category-page min-h-screen bg-cream">
      {/* Hero Banner */}
      <div className="bg-coral/10 py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-coral hover:underline mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Shop
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-text font-serif mb-4">
            {categoryName}
          </h1>
          <p className="text-text-muted text-lg max-w-2xl">
            Browse our collection of {categoryName.toLowerCase()}. Each piece is handcrafted
            by skilled artisans from Aluva, Kerala.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-text-muted">
            Showing <span className="font-semibold text-text">{sortedProducts.length}</span> products
          </p>

          <div className="relative">
            <select
              className="appearance-none bg-white border border-gray-200 px-4 py-2 rounded-lg pr-10 cursor-pointer focus:ring-2 focus:ring-coral focus:border-transparent"
              onChange={(e) =>
                setSortBy(
                  e.target.value === "" ? null : (e.target.value as typeof sortBy)
                )
              }
              value={sortBy || ""}
            >
              <option value="">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Products Grid */}
        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} variant="white" />
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
