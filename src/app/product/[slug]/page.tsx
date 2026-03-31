"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { ProductCard } from "@/components/product/ProductCard";
import { ColorSwatches } from "@/components/product/ColorSwatches";
import { SizeSelector } from "@/components/product/SizeSelector";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getProductBySlug, getRelatedProducts, recordProductView } from "@/lib/services/products";
import type { ProductWithCategory, ProductVariant } from "@/types";
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

export default function ProductDetailPage() {
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
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"details" | "specs" | "care">("details");
    const [imageError, setImageError] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const { addToCart } = useCart();

    // Initialize from URL params
    useEffect(() => {
      const colorParam = searchParams.get('color');
      const sizeParam = searchParams.get('size');
      if (colorParam) setSelectedColor(colorParam);
      if (sizeParam) setSelectedSize(sizeParam);
    }, [searchParams]);

    // Record product view + Meta Pixel ViewContent
    useEffect(() => {
      if (product?.id) {
        recordProductView(product.id);
        trackViewContent({ id: product.id, name: product.name, price: Number(product.price), category: product.category?.name });
      }
    }, [product?.id]);

    // Compute variants data
    const hasVariants = product?.has_variants && product.variants && product.variants.length > 0;
    const variants = product?.variants || [];

    // Get unique colors with stock info
    const colorOptions = useMemo(() => {
      if (!hasVariants) return [];
      const colorMap = new Map<string, { hex: string; inStock: boolean; stock: number }>();
      variants.forEach(v => {
        const existing = colorMap.get(v.color_name);
        const inStock = v.stock_quantity > 0;
        if (!existing || (inStock && !existing.inStock)) {
          colorMap.set(v.color_name, { hex: v.color_hex, inStock, stock: v.stock_quantity });
        } else if (inStock && existing.inStock) {
          // Merge stock count
          colorMap.set(v.color_name, { 
            hex: v.color_hex, 
            inStock: true, 
            stock: existing.stock + v.stock_quantity 
          });
        }
      });
      return Array.from(colorMap.entries()).map(([name, data]) => ({
        name,
        hex: data.hex,
        inStock: data.inStock,
        lowStock: data.stock > 0 && data.stock < 5,
      }));
    }, [variants, hasVariants]);

    // Get available sizes for selected color
    const availableSizes = useMemo(() => {
      if (!selectedColor) return product?.sizes || [];
      return variants
        .filter(v => v.color_name === selectedColor && v.stock_quantity > 0)
        .map(v => v.size);
    }, [selectedColor, variants, product?.sizes]);

    // Find matching variant
    const selectedVariant: ProductVariant | null = useMemo(() => {
      if (!hasVariants || !selectedColor || !selectedSize) return null;
      return variants.find(v => 
        v.color_name === selectedColor && 
        v.size === selectedSize && 
        v.stock_quantity > 0
      ) || null;
    }, [selectedColor, selectedSize, variants, hasVariants]);

    // Compute display price
    const basePrice = Number(product?.price || 0);
    const priceAdjustment = selectedVariant?.price_adjustment || 0;
    const displayPrice = basePrice + priceAdjustment;
    const mrp = product?.compare_price ? Number(product.compare_price) : 0;
    const hasDiscount = mrp > 0 && mrp > displayPrice && displayPrice > 0;
    const discountPercent = hasDiscount ? Math.round(((mrp - displayPrice) / mrp) * 100) : 0;

    // Variant stock
    const variantStock = selectedVariant?.stock_quantity || 0;
    const isOutOfStock = hasVariants 
      ? (!selectedVariant || variantStock === 0)
      : product?.in_stock === false;

    // Build gallery images
    const allImages: string[] = useMemo(() => {
      const images: string[] = [];
      
      // Use variant images if available
      if (selectedVariant?.variant_images && selectedVariant.variant_images.length > 0) {
        images.push(...selectedVariant.variant_images);
      } else if (selectedVariant?.variant_image) {
        images.push(selectedVariant.variant_image);
      }
      
      // Fallback to product main image
      const mainImg = product?.image_url || '';
      if (mainImg && !mainImg.startsWith('blob:') && !mainImg.startsWith('data:')) {
        if (!images.includes(mainImg)) images.push(mainImg);
      }
      
      // Add gallery images
      if (product?.images && product.images.length > 0) {
        product.images.forEach(img => {
          if (img && !images.includes(img)) images.push(img);
        });
      }
      
      if (images.length === 0) {
        images.push(`https://placehold.co/600x800/E8657B/FFF?text=${encodeURIComponent((product?.name || 'Product').replace(/ /g, '+'))}`);
      }
      
      return images;
    }, [product, selectedVariant]);

    const currentImage = allImages[selectedImageIndex] || allImages[0];
    const hasMultipleImages = allImages.length > 1;

    // Reset image index when color changes
    useEffect(() => {
      setSelectedImageIndex(0);
      setImageError(false);
    }, [selectedColor]);

    const handleAddToCart = () => {
      if (!product) return;
      if (hasVariants && !selectedVariant) return;
      
      addToCart({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: displayPrice,
        image: currentImage,
        variant_id: selectedVariant?.id,
        color: selectedColor || undefined,
        size: selectedSize || undefined,
      }, quantity);
    };

    // URL update when selections change
    useEffect(() => {
      if (!product || (!selectedColor && !selectedSize)) return;
      const params = new URLSearchParams();
      if (selectedColor) params.set('color', selectedColor);
      if (selectedSize) params.set('size', selectedSize);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }, [selectedColor, selectedSize, product]);

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
                            className="object-cover transition-opacity duration-300"
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
                          {hasVariants && !selectedVariant ? (
                            <span className="text-2xl font-semibold text-orange">From ₹{basePrice}</span>
                          ) : (
                            <span className="text-2xl font-semibold text-orange">₹{displayPrice}</span>
                          )}
                          {hasDiscount && (
                            <>
                              <span className="text-lg text-text-muted line-through">₹{mrp}</span>
                              <span className="text-sm font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-full">{discountPercent}% OFF</span>
                            </>
                          )}
                        </div>
                        {selectedVariant && (
                          <p className="text-sm text-text-muted mt-1">SKU: {selectedVariant.sku}</p>
                        )}
                    </div>

                    <p className="text-text-muted leading-relaxed text-lg mb-8">
                        {product.long_description || product.description}
                    </p>

                    <div className="mt-auto space-y-6">
                        {/* Color Swatches */}
                        {hasVariants && colorOptions.length > 0 && (
                          <ColorSwatches
                            colors={colorOptions}
                            selected={selectedColor}
                            onSelect={setSelectedColor}
                          />
                        )}

                        {/* Size Selector */}
                        {(hasVariants || product.sizes.length > 0) && (
                          <SizeSelector
                            sizes={product.sizes}
                            selected={selectedSize}
                            availableSizes={hasVariants ? availableSizes : product.sizes}
                            onSelect={setSelectedSize}
                          />
                        )}

                        {/* Stock & Variant Info */}
                        {hasVariants && selectedVariant && (
                          <div className="flex items-center gap-2 text-sm">
                            {variantStock === 0 ? (
                              <span className="text-red-500 font-medium">Out of Stock</span>
                            ) : variantStock < 5 ? (
                              <span className="text-amber-600 font-medium">Only {variantStock} left in this color/size</span>
                            ) : (
                              <span className="text-green-600 font-medium">In Stock</span>
                            )}
                          </div>
                        )}

                        {/* Validation message */}
                        {hasVariants && (!selectedColor || !selectedSize) && (
                          <p className="text-sm text-amber-600">
                            Please select {(!selectedColor && !selectedSize) ? 'color and size' : !selectedColor ? 'color' : 'size'} to add to cart
                          </p>
                        )}

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
                            {isOutOfStock ? (
                              <div className="w-full text-lg h-14 font-semibold bg-gray-200 text-gray-500 rounded-lg flex items-center justify-center">
                                Out of Stock
                              </div>
                            ) : (
                              <Button
                                  size="lg"
                                  variant="primary"
                                  className="w-full text-lg h-14 font-semibold shadow-lg shadow-coral/20 hover:shadow-coral/30 transition-all disabled:opacity-50"
                                  onClick={handleAddToCart}
                                  disabled={hasVariants && !selectedVariant}
                              >
                                  <ShoppingBag className="mr-2 h-5 w-5" />
                                  {hasVariants && !selectedVariant ? 'Select Options' : 'Add to Cart'}
                              </Button>
                            )}
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
                                  ...(selectedVariant ? [["SKU", selectedVariant.sku]] : []),
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

            {/* Disclaimer */}
            <div className="mb-10 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm leading-relaxed">
              <span className="font-semibold">Please note:</span> Not all products listed on this website are Khadi and pure handloom. We offer a curated range of cotton and blended fabrics. We kindly request you to check individual product descriptions carefully before placing your order.
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
