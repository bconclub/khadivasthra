"use client";

import Link from "next/link";
import Image from "next/image";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getCategories } from "@/lib/services/categories";
import { getProducts } from "@/lib/services/products";
import { Loader2, ImageOff } from "lucide-react";
import { useState } from "react";

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

      {/* Collections Grid */}
      <div className="container mx-auto px-4 max-w-7xl py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {allCategories.map((cat) => {
            const productCount = allProducts.filter(
              (p) => p.category_id === cat.id
            ).length;

            return (
              <CollectionCard
                key={cat.id}
                name={cat.name}
                slug={cat.slug}
                description={cat.description || `Browse our collection of ${cat.name.toLowerCase()}`}
                image={cat.image_url || ''}
                productCount={productCount}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CollectionCard({ name, slug, description, image, productCount }: {
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
}) {
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
    <Link href={`/shop/${slug}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="relative aspect-[4/3] overflow-hidden">
          {hasImage ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-coral/10">
              <ImageOff className="w-16 h-16 text-coral/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h2 className="text-xl md:text-2xl font-bold text-white font-serif mb-1">
            {name}
          </h2>
          <p className="text-white/80 text-sm mb-2">
            {description}
          </p>
          <span className="text-white/70 text-xs">
            {productCount} {productCount === 1 ? "product" : "products"}
          </span>
        </div>
      </div>
    </Link>
  );
}
