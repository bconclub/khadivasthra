"use client";

import { useState, useEffect, useRef } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/categories";
import type { ProductWithCategory } from "@/types";
import { ArrowUpDown, Loader2, Check } from "lucide-react";

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

export default function ShopPage() {
  const { data: products, loading: loadingProducts } = useSupabaseQuery(getProducts);
  const { data: categories } = useSupabaseQuery(getCategories);
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "newest" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setHeaderVisible(y < lastScrollY.current && y > 80);
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const allProducts = products || [];

  // Only show categories that have products, sorted by product count (most first)
  const categoriesWithProducts = (categories || [])
    .filter(c => allProducts.some(p => p.category?.name === c.name))
    .sort((a, b) => {
      const countA = allProducts.filter(p => p.category?.name === a.name).length;
      const countB = allProducts.filter(p => p.category?.name === b.name).length;
      return countB - countA;
    });
  const categoryNames = categoriesWithProducts.map(c => c.name);

  // Filter products
  let filteredProducts = selectedCategory
    ? allProducts.filter((p) => p.category?.name === selectedCategory)
    : allProducts;

  // Sort products — default: best sellers & featured first
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") return Number(a.price) - Number(b.price);
    if (sortBy === "price-desc") return Number(b.price) - Number(a.price);
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    // Default: best sellers first, then featured, then rest
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
            {/* Mobile Category Tags & Sort - sticky */}
            <div className={`lg:hidden sticky z-40 -mx-4 px-4 bg-cream border-b border-gray-200 transition-all duration-300 ${headerVisible ? 'top-16' : 'top-0'}`}>
              <div className="flex items-center gap-2 py-3">
                <div className="flex-1 overflow-x-auto scrollbar-hide -mx-1">
                  <div className="flex gap-2 px-1 w-max">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        !selectedCategory ? "bg-coral text-white shadow-sm" : "bg-white/80 text-text"
                      }`}
                    >
                      All <span className="text-xs opacity-75">{allProducts.length}</span>
                    </button>
                    {categoryNames.map((cat) => {
                      const count = allProducts.filter(p => p.category?.name === cat).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                            selectedCategory === cat ? "bg-coral text-white shadow-sm" : "bg-white/80 text-text"
                          }`}
                        >
                          {cat} <span className="text-xs opacity-75">{count}</span>
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
                        {[
                          { value: null, label: "Featured" },
                          { value: "price-asc", label: "Price: Low → High" },
                          { value: "price-desc", label: "Price: High → Low" },
                          { value: "newest", label: "Newest First" },
                        ].map((option) => (
                          <button
                            key={option.label}
                            onClick={() => { setSortBy(option.value as typeof sortBy); setShowSortMenu(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-cream/50 transition-colors"
                          >
                            {option.label}
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
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
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
