"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { ProductCard } from "@/components/product/ProductCard";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getProductBySlug, getRelatedProducts, recordProductView } from "@/lib/services/products";
import type { ProductWithCategory } from "@/types";
import { Minus, Plus, ShoppingBag, Truck, ShieldCheck, Ruler, Droplets, Info, ImageOff, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function toCardProduct(product: ProductWithCategory) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    compare_price: product.compare_price ? Number(product.compare_price) : null,
    image: product.image_url || '',
    category: product.category?.name || '',
  };
}

export default function ProductDetailPage() {
    const params = useParams();
    const slug = params.slug as string;
    const { data: product, loading } = useSupabaseQuery(
      () => getProductBySlug(slug), [slug]
    );
    const { data: relatedProducts } = useSupabaseQuery(
      () => product ? getRelatedProducts(product) : Promise.resolve([]),
      [product?.id]
    );
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<"details" | "specs" | "care">("details");
    const [imageError, setImageError] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const { addToCart } = useCart();

    // Record product view
    useEffect(() => {
      if (product?.id) {
        recordProductView(product.id);
      }
    }, [product?.id]);

    if (loading) {
      return (
        <div className="container mx-auto px-4 max-w-7xl py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral" />
        </div>
      );
    }

    if (!product) {
        return <div className="container mx-auto px-4 max-w-7xl py-20 text-center">Product not found</div>;
    }

    const handleAddToCart = () => {
        addToCart({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: Number(product.price),
          image: product.image_url || '',
        }, quantity);
    };

    // Build gallery: main image + additional gallery images
    const allImages: string[] = [];
    const mainImg = product.image_url || '';
    if (mainImg && !mainImg.startsWith('blob:') && !mainImg.startsWith('data:') && (mainImg.startsWith('/images/') || mainImg.startsWith('https://'))) {
      allImages.push(mainImg);
    }
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        if (img && !allImages.includes(img)) allImages.push(img);
      }
    }
    if (allImages.length === 0) {
      allImages.push(`https://placehold.co/600x800/E8657B/FFF?text=${encodeURIComponent(product.name.replace(/ /g, '+'))}`);
    }

    const currentImage = allImages[selectedImageIndex] || allImages[0];
    const hasMultipleImages = allImages.length > 1;

    // Discount calculation
    const salePrice = Number(product.price);
    const mrp = product.compare_price ? Number(product.compare_price) : 0;
    const hasDiscount = mrp > 0 && mrp > salePrice && salePrice > 0;
    const discountPercent = hasDiscount ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;

    const details = product.details || {};
    const careInstructions = product.care_instructions || ['Hand wash cold', 'Dry in shade'];

    return (
        <div className="product-detail-page container mx-auto px-4 max-w-7xl py-12">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 mb-20">
                {/* Image Gallery */}
                <div className="space-y-3">
                  <div className="relative aspect-[3/4] bg-cream/30 rounded-2xl overflow-hidden shadow-lg border border-cream/30">
                    {!imageError && currentImage ? (
                        <Image
                            src={currentImage}
                            alt={product.name}
                            fill
                            className="object-cover"
                            priority
                            onError={() => setImageError(true)}
                            unoptimized
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                            <ImageOff className="w-24 h-24 mb-4" />
                            <p className="text-sm text-center px-4">No image available</p>
                        </div>
                    )}
                    {/* Discount badge */}
                    {hasDiscount && (
                      <span className="absolute top-3 left-3 bg-coral text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                        {discountPercent}% OFF
                      </span>
                    )}
                    {/* Gallery nav arrows */}
                    {hasMultipleImages && (
                      <>
                        <button
                          onClick={() => setSelectedImageIndex((selectedImageIndex - 1 + allImages.length) % allImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-700" />
                        </button>
                        <button
                          onClick={() => setSelectedImageIndex((selectedImageIndex + 1) % allImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-700" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail strip */}
                  {hasMultipleImages && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {allImages.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => { setSelectedImageIndex(index); setImageError(false); }}
                          className={cn(
                            "relative w-16 h-20 md:w-20 md:h-24 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all",
                            selectedImageIndex === index ? "border-coral shadow-md" : "border-gray-200 hover:border-coral/50"
                          )}
                        >
                          <Image src={img} alt={`${product.name} ${index + 1}`} fill className="object-cover" unoptimized />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex flex-col h-full">
                    <div className="mb-6">
                        <span className="inline-block px-3 py-1 bg-cream/50 text-text-muted text-xs font-semibold uppercase tracking-wider rounded-full mb-3 border border-cream/30">
                            {product.category?.name}
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold text-text leading-tight mb-2 font-serif">{product.name}</h1>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-2xl font-semibold text-orange">&#8377;{salePrice}</span>
                          {hasDiscount && (
                            <>
                              <span className="text-lg text-text-muted line-through">&#8377;{mrp}</span>
                              <span className="text-sm font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-full">{discountPercent}% OFF</span>
                            </>
                          )}
                        </div>
                    </div>

                    <p className="text-text-muted leading-relaxed text-lg mb-8">
                        {product.long_description || product.description}
                    </p>

                    <div className="mt-auto space-y-8">
                        <div className="p-6 bg-white rounded-xl shadow-sm border border-cream/30">
                            <div className="flex items-center space-x-6 mb-6">
                                <span className="font-medium text-text">Quantity</span>
                                <div className="flex items-center border border-cream/30 rounded-lg bg-white">
                                    <button className="p-3 hover:bg-cream/50 rounded-l-lg transition-all text-coral" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-12 text-center font-bold text-text">{quantity}</span>
                                    <button className="p-3 hover:bg-cream/50 rounded-r-lg transition-all text-coral" onClick={() => setQuantity(quantity + 1)}>
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <Button
                                size="lg"
                                variant="primary"
                                className="w-full text-lg h-14 font-semibold shadow-lg shadow-coral/20 hover:shadow-coral/30 transition-all"
                                onClick={handleAddToCart}
                            >
                                <ShoppingBag className="mr-2 h-5 w-5" />
                                Add to Cart
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3 text-sm text-text-muted bg-cream/50 p-3 rounded-lg border border-cream/30">
                                <Truck className="h-5 w-5 text-coral shrink-0" />
                                <span>Fast Delivery across Kerala</span>
                            </div>
                            <div className="flex items-center space-x-3 text-sm text-text-muted bg-cream/50 p-3 rounded-lg border border-cream/30">
                                <ShieldCheck className="h-5 w-5 text-coral shrink-0" />
                                <span>Authentic Quality Guaranteed</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-20">
                <div className="flex border-b border-cream/30 mb-8 overflow-x-auto">
                    {(["details", "specs", "care"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "px-8 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                          activeTab === tab ? "border-coral text-coral" : "border-transparent text-text-muted hover:text-text"
                        )}
                      >
                        {tab === "details" ? "Description" : tab === "specs" ? "Specifications" : "Material & Care"}
                      </button>
                    ))}
                </div>

                <div className="bg-white p-8 md:p-12 rounded-2xl border border-cream/30 min-h-[300px]">
                    {activeTab === "details" && (
                        <div className="max-w-3xl">
                            <h3 className="text-2xl font-bold text-text mb-6 flex items-center gap-3 font-serif">
                                <Info className="h-6 w-6 text-coral" /> Product Description
                            </h3>
                            <p className="text-text-muted leading-loose text-lg">
                                {product.long_description || product.description}
                                <br /><br />
                                Our collection reflects the timeless beauty of Kerala&apos;s handloom tradition.
                                Whether it is for a wedding, a festival, or daily wear, this mundu is designed to
                                give you elegance and comfort.
                            </p>
                        </div>
                    )}
                    {activeTab === "specs" && (
                        <div className="max-w-3xl">
                            <h3 className="text-2xl font-bold text-text mb-6 flex items-center gap-3 font-serif">
                                <Ruler className="h-6 w-6 text-coral" /> Product Specifications
                            </h3>
                            <div className="grid md:grid-cols-2 gap-y-4 gap-x-12">
                                {[
                                  ["Classification", product.category?.name],
                                  ["Weave Type", details.weave || 'Handloom'],
                                  ["Fit", details.fit || 'Regular Fit'],
                                  ["Origin", details.origin || 'Aluva, Kerala'],
                                  ["Dimensions", details.dimensions || 'Standard'],
                                ].map(([label, value]) => (
                                  <div key={label} className="flex justify-between py-3 border-b border-cream/30">
                                    <span className="text-text-muted">{label}</span>
                                    <span className="font-medium text-text">{value}</span>
                                  </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === "care" && (
                        <div className="max-w-3xl">
                            <h3 className="text-2xl font-bold text-text mb-6 flex items-center gap-3 font-serif">
                                <Droplets className="h-6 w-6 text-coral" /> Material & Care Instructions
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-bold text-text mb-2">Material</h4>
                                    <p className="text-text-muted">{product.material || details.material || '100% Cotton'}</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-text mb-3">Care Instructions</h4>
                                    <ul className="grid md:grid-cols-2 gap-3">
                                        {careInstructions.map((instruction: string, i: number) => (
                                            <li key={i} className="flex items-center gap-3 text-text-muted">
                                                <span className="h-1.5 w-1.5 rounded-full bg-coral shrink-0" />
                                                {instruction}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Related Products */}
            {relatedProducts && relatedProducts.length > 0 && (
                <section className="border-t border-cream/30 pt-16">
                    <h2 className="text-3xl font-bold mb-10 text-text font-serif text-center">You May Also Like</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {relatedProducts.map(p => (
                            <ProductCard key={p.id} product={toCardProduct(p)} variant="white" />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
