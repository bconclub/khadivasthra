"use client";

import Link from "next/link";
import Image from "next/image";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getCategories } from "@/lib/services/categories";
import { getProducts } from "@/lib/services/products";
import { ProductCard } from "@/components/product/ProductCard";
import { Loader2, ImageOff, ArrowRight } from "lucide-react";
import { useState } from "react";
import type { ProductWithCategory } from "@/types";

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

export default function CollectionsPage() {
  const { data: categories, loading: loadingCategories } = useSupabaseQuery(getCategories);
  const { data: products, loading: loadingProducts } = useSupabaseQuery(getProducts);

  if (loadingCategories || loadingProducts) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  const allCategories = categories || [];
  const allProducts = products || [];

  return (
    <div className="collections-page min-h-screen bg-cream">
      {/* Hero Banner */}
      <div className="bg-coral/10 py-12">
        <div className="container mx-auto px-4 max-w-7xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-text font-serif mb-4">
            Our Collections
          </h1>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Browse our curated collections of authentic Kerala handloom mundus,
            organized by style and tradition.
          </p>
        </div>
      </div>

      {/* Collections with Products */}
      <div className="container mx-auto px-4 max-w-7xl py-10 space-y-12">
        {allCategories.map((cat) => {
          const categoryProducts = allProducts
            .filter((p) => p.category_id === cat.id)
            .slice(0, 4);

          if (categoryProducts.length === 0) return null;

          const totalCount = allProducts.filter((p) => p.category_id === cat.id).length;

          return (
            <section key={cat.id} className="collection-section">
              {/* Category Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <CategoryThumb image={cat.image_url || ''} name={cat.name} />
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-text font-serif">
                      {cat.name}
                    </h2>
                    <p className="text-text-muted text-sm mt-0.5">
                      {totalCount} {totalCount === 1 ? "product" : "products"}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/shop/${cat.slug}`}
                  className="flex items-center gap-1.5 text-coral hover:text-coral-dark font-semibold text-sm transition-colors group"
                >
                  View All
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
                {categoryProducts.map((product) => (
                  <ProductCard key={product.id} product={toCardProduct(product)} variant="cream" />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CategoryThumb({ image, name }: { image: string; name: string }) {
  const [imageError, setImageError] = useState(false);

  let imagePath = image;
  if (imagePath.startsWith('blob:') || imagePath.startsWith('data:')) {
    imagePath = '';
  }
  const imageUrl = imagePath && (imagePath.startsWith('/images/') || imagePath.startsWith('https://'))
    ? imagePath
    : '';

  const hasImage = !imageError && imageUrl;

  return (
    <div className="hidden md:block w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-coral/10">
      {hasImage ? (
        <Image
          src={imageUrl}
          alt={name}
          width={56}
          height={56}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          unoptimized
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageOff className="w-6 h-6 text-coral/30" />
        </div>
      )}
    </div>
  );
}
