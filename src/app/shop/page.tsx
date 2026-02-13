"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/categories";
import type { ProductWithCategory } from "@/types";
import { ArrowUpDown, Filter, Loader2 } from "lucide-react";

function toCardProduct(product: ProductWithCategory) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    image: product.image_url || '',
    category: product.category?.name || '',
  };
}

export default function ShopPage() {
  const { data: products, loading: loadingProducts } = useSupabaseQuery(getProducts);
  const { data: categories } = useSupabaseQuery(getCategories);
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "newest" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const allProducts = products || [];
  const categoryNames = categories?.map(c => c.name) || [];

  // Filter products
  let filteredProducts = selectedCategory
    ? allProducts.filter((p) => p.category?.name === selectedCategory)
    : allProducts;

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") return Number(a.price) - Number(b.price);
    if (sortBy === "price-desc") return Number(b.price) - Number(a.price);
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return 0;
  });

  if (loadingProducts) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="shop-page min-h-screen bg-cream">
      {/* Hero Banner */}
      <div className="bg-coral/10 py-12">
        <div className="container mx-auto px-4 max-w-7xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-text font-serif mb-4">
            Shop All Products
          </h1>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Discover our complete collection of authentic Kerala handloom mundus,
            crafted by skilled artisans from Aluva.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-text mb-4">Categories</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      !selectedCategory ? "bg-coral text-white" : "hover:bg-cream text-text"
                    }`}
                  >
                    All Products
                  </button>
                  {categoryNames.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedCategory === cat ? "bg-coral text-white" : "hover:bg-cream text-text"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-text mb-4">Sort By</h3>
                <div className="space-y-2">
                  {[
                    { value: null, label: "Featured" },
                    { value: "price-asc", label: "Price: Low to High" },
                    { value: "price-desc", label: "Price: High to Low" },
                    { value: "newest", label: "Newest First" },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setSortBy(option.value as typeof sortBy)}
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
            {/* Mobile Filters Toggle & Sort */}
            <div className="lg:hidden mb-6 flex gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex-1 flex items-center justify-center gap-2 bg-white px-4 py-3 rounded-lg shadow-sm"
              >
                <Filter className="w-5 h-5" />
                Filters
              </button>
              <div className="flex-1 relative">
                <select
                  className="w-full appearance-none bg-white px-4 py-3 rounded-lg shadow-sm pr-10"
                  onChange={(e) => setSortBy(e.target.value === "" ? null : e.target.value as typeof sortBy)}
                  value={sortBy || ""}
                >
                  <option value="">Sort: Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
                <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Mobile Filters Panel */}
            {showFilters && (
              <div className="lg:hidden mb-6 bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-text mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setSelectedCategory(null); setShowFilters(false); }}
                    className={`px-4 py-2 rounded-full text-sm transition-colors ${
                      !selectedCategory ? "bg-coral text-white" : "bg-cream text-text"
                    }`}
                  >
                    All
                  </button>
                  {categoryNames.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setShowFilters(false); }}
                      className={`px-4 py-2 rounded-full text-sm transition-colors ${
                        selectedCategory === cat ? "bg-coral text-white" : "bg-cream text-text"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-text-muted">
                Showing <span className="font-semibold text-text">{sortedProducts.length}</span> products
                {selectedCategory && (
                  <span> in <span className="font-semibold text-coral">{selectedCategory}</span></span>
                )}
              </p>
              <div className="hidden lg:flex items-center gap-2">
                <span className="text-sm text-text-muted">Sort by:</span>
                <select
                  className="appearance-none bg-white border border-gray-200 px-4 py-2 rounded-lg pr-10 cursor-pointer focus:ring-2 focus:ring-coral focus:border-transparent"
                  onChange={(e) => setSortBy(e.target.value === "" ? null : e.target.value as typeof sortBy)}
                  value={sortBy || ""}
                >
                  <option value="">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {sortedProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {sortedProducts.map((product) => (
                  <ProductCard key={product.id} product={toCardProduct(product)} variant="white" />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-xl">
                <p className="text-text-muted text-lg">No products found in this category.</p>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="mt-4 text-coral hover:underline"
                >
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
