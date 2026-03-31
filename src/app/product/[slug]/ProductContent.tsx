"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { ProductCard } from "@/components/product/ProductCard";
import { ColorSwatches } from "@/components/product/ColorSwatches";
import { SizeSelector } from "@/components/product/SizeSelector";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getProductBySlug, getRelatedProducts, recordProductView } from "@/lib/services/products";
import type { ProductWithCategory, ProductColor, ProductVariant } from "@/types";
import { Minus, Plus, ShoppingBag, Truck, ShieldCheck, Ruler, Droplets, Info, ImageOff, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackViewContent } from "@/lib/fbq";

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

function ProductContentInner() {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = (params?.slug as string) || (typeof window !== 'undefined'
      ? window.location.pathname.split('/').filter(Boolean)[1] || ''
      : '');
    
    const { data: product, loading } = useSupabaseQuery(
      () => getProductBySlug(slug), [slug]
    );
    const { data: relatedProducts } = useSupabaseQuery(
      () => product ? getRelatedProducts(product) : Promise.resolve([]),
      [product?.id]
    );
    
    const [quantity, setQuantity] = useState(1);
    const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"details" | "specs" | "care">("details");
    const [imageError, setImageError] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const { addToCart } = useCart();

    // Initialize from URL params
    useEffect(() => {
      const colorParam = searchParams.get('color');
      const sizeParam = searchParams.get('size');
      if (colorParam && product?.colors) {
        const color = product.colors.find(c => c.name.toLowerCase() === colorParam.toLowerCase());
        if (color) setSelectedColorId(color.id);
      }
      if (sizeParam) {
        setSelectedSize(sizeParam.toUpperCase());
      }
    }, [searchParams, product]);

    // Record view
    useEffect(() => {
      if (product) {
        recordProductView(product.id).catch(() => {});
        trackViewContent({ id: product.id, name: product.name, price: product.price, category: product.category?.name });
      }
    }, [product]);

    // Get selected color
    const selectedColor = useMemo(() => {
      if (!product?.colors) return null;
      return product.colors.find(c => c.id === selectedColorId) || null;
    }, [product, selectedColorId]);

    // Get images for selected color or product images
    const images = useMemo(() => {
      if (selectedColor?.images?.length) return selectedColor.images;
      return product?.images?.length ? product.images : (product?.image_url ? [product.image_url] : []);
    }, [selectedColor, product]);

    // Get variant for selected color+size
    const selectedVariant = useMemo(() => {
      if (!selectedColorId || !selectedSize || !product?.variants) return null;
      return product.variants.find(v => v.color_id === selectedColorId && v.size === selectedSize) || null;
    }, [product, selectedColorId, selectedSize]);

    // Final price calculation
    const finalPrice = useMemo(() => {
      if (!product) return 0;
      const basePrice = Number(product.price);
      const adjustment = selectedVariant?.price_adjustment || 0;
      return basePrice + adjustment;
    }, [product, selectedVariant]);

    // Stock quantity
    const stockQuantity = useMemo(() => {
      return selectedVariant?.stock_quantity ?? product?.stock_quantity ?? 0;
    }, [selectedVariant, product]);

    // Get sizes available for selected color
    const availableSizes = useMemo(() => {
      if (!selectedColor || !product?.variants) return [];
      return product.variants
        .filter(v => v.color_id === selectedColor.id && v.is_active)
        .map(v => ({ size: v.size, stock: v.stock_quantity }));
    }, [selectedColor, product]);

    // Update URL when selection changes
    useEffect(() => {
      if (!product || typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      if (selectedColor) {
        url.searchParams.set('color', selectedColor.name);
      } else {
        url.searchParams.delete('color');
      }
      if (selectedSize) {
        url.searchParams.set('size', selectedSize);
      } else {
        url.searchParams.delete('size');
      }
      window.history.replaceState({}, '', url.toString());
    }, [product, selectedColor, selectedSize]);

    // Image navigation
    const nextImage = () => setSelectedImageIndex((prev) => (prev + 1) % images.length);
    const prevImage = () => setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);

    // Handle add to cart
    const handleAddToCart = () => {
      if (!product) return;
      if (product.has_variants && (!selectedColorId || !selectedSize)) {
        alert("Please select a color and size");
        return;
      }
      addToCart({
        id: product.id,
        variant_id: selectedVariant?.id,
        name: product.name,
        color_name: selectedColor?.name,
        size: selectedSize || undefined,
        price: finalPrice,
        image: selectedColor?.images?.[0] || product.image_url || '',
      }, quantity);
    };

    // Loading state
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-coral" />
        </div>
      );
    }

    if (!product) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text mb-2">Product Not Found</h1>
            <p className="text-text-muted">The product you&apos;re looking for doesn&apos;t exist.</p>
          </div>
        </div>
      );
    }

    const mrp = product.compare_price ? Number(product.compare_price) : 0;
    const discount = mrp > finalPrice ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

    return (
      <div className="min-h-screen bg-background py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="text-sm mb-6">
            <ol className="flex items-center gap-2 text-text-muted">
              <li><a href="/" className="hover:text-text">Home</a></li>
              <li>/</li>
              <li><a href={`/category/${product.category?.slug}`} className="hover:text-text">{product.category?.name}</a></li>
              <li>/</li>
              <li className="text-text font-medium truncate max-w-xs">{product.name}</li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-secondary/30">
                {images.length > 0 && !imageError ? (
                  <Image
                    src={images[selectedImageIndex]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <ImageOff className="w-20 h-20 text-gray-300" />
                  </div>
                )}
                
                {/* Image Navigation */}
                {images.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-md hover:bg-white">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-md hover:bg-white">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {product.is_best_seller && (
                    <span className="bg-amber-400 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                      Best Seller
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                      {discount}% OFF
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={cn(
                        "relative w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                        selectedImageIndex === idx ? "border-coral" : "border-transparent"
                      )}
                    >
                      <Image src={img} alt="" fill className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-5">
              {/* Header */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">{product.name}</h1>
                <p className="text-text-muted">{product.category?.name}</p>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-text">₹{finalPrice}</span>
                {mrp > finalPrice && (
                  <>
                    <span className="text-lg text-text-muted line-through">₹{mrp}</span>
                    <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded">
                      {discount}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Material */}
              {product.material && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <span className="font-medium">Material:</span>
                  <span>{product.material}</span>
                </div>
              )}

              {/* Color Selection */}
              {product.has_variants && product.colors && product.colors.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-text mb-3">
                    Color: <span className="text-text-muted font-normal">{selectedColor?.name || "Select a color"}</span>
                  </h3>
                  <ColorSwatches
                    colors={product.colors.map(c => ({
                      id: c.id,
                      name: c.name,
                      hex: c.hex_code,
                      inStock: c.variants?.some(v => v.stock_quantity > 0) ?? true,
                    }))}
                    selected={selectedColorId}
                    onSelect={setSelectedColorId}
                  />
                </div>
              )}

              {/* Size Selection */}
              {product.has_variants && availableSizes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-text mb-3">
                    Size: <span className="text-text-muted font-normal">{selectedSize || "Select a size"}</span>
                  </h3>
                  <SizeSelector
                    sizes={availableSizes.map(s => s.size)}
                    selected={selectedSize}
                    availableSizes={availableSizes.filter(s => s.stock > 0).map(s => s.size)}
                    onSelect={setSelectedSize}
                  />
                </div>
              )}

              {/* Stock Info */}
              {stockQuantity < 5 && stockQuantity > 0 && (
                <p className="text-sm text-amber-600">Only {stockQuantity} left in stock!</p>
              )}
              {stockQuantity === 0 && (
                <p className="text-sm text-red-500">Out of stock</p>
              )}

              {/* Quantity & Add to Cart */}
              <div className="flex items-center gap-4 pt-4">
                <div className="flex items-center border border-gray-200 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 hover:bg-gray-100"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-3 font-medium min-w-[2rem] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(stockQuantity, quantity + 1))}
                    className="px-3 py-2 hover:bg-gray-100"
                    disabled={quantity >= stockQuantity}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  onClick={handleAddToCart}
                  disabled={stockQuantity === 0}
                  className="flex-1 bg-coral hover:bg-coral/90 text-white h-11"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  {stockQuantity === 0 ? "Out of Stock" : "Add to Cart"}
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-gray-100">
                <div className="text-center">
                  <Truck className="w-5 h-5 mx-auto mb-1 text-text-muted" />
                  <p className="text-xs text-text-muted">Free Shipping</p>
                </div>
                <div className="text-center">
                  <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-text-muted" />
                  <p className="text-xs text-text-muted">Quality Assured</p>
                </div>
                <div className="text-center">
                  <Ruler className="w-5 h-5 mx-auto mb-1 text-text-muted" />
                  <p className="text-xs text-text-muted">Easy Returns</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex gap-6 border-b border-gray-100">
                  {["details", "specs", "care"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as typeof activeTab)}
                      className={cn(
                        "pb-2 text-sm font-medium capitalize transition-colors",
                        activeTab === tab ? "text-coral border-b-2 border-coral" : "text-text-muted hover:text-text"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="py-4 text-sm text-text-muted">
                  {activeTab === "details" && (
                    <div className="space-y-2">
                      <p>{product.long_description || product.description}</p>
                    </div>
                  )}
                  {activeTab === "specs" && (
                    <div className="space-y-2">
                      {product.material && (
                        <div className="flex justify-between py-1">
                          <span>Material</span>
                          <span className="font-medium">{product.material}</span>
                        </div>
                      )}
                      {product.weight && (
                        <div className="flex justify-between py-1">
                          <span>Weight</span>
                          <span className="font-medium">{product.weight} kg</span>
                        </div>
                      )}
                      {product.length && product.breadth && product.height && (
                        <div className="flex justify-between py-1">
                          <span>Dimensions</span>
                          <span className="font-medium">{product.length} × {product.breadth} × {product.height} cm</span>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === "care" && (
                    <div className="space-y-2">
                      {product.care_instructions?.length ? (
                        <ul className="space-y-1">
                          {product.care_instructions.map((instruction, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Droplets className="w-4 h-4 mt-0.5 text-coral flex-shrink-0" />
                              <span>{instruction}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No specific care instructions available.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts && relatedProducts.length > 0 && (
            <section className="mt-16">
              <h2 className="text-xl font-bold text-text mb-6">You May Also Like</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={toCardProduct(p)} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
}

// Wrapper component with Suspense
export default function ProductContent() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-coral" />
      </div>
    }>
      <ProductContentInner />
    </Suspense>
  );
}
