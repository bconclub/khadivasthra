"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { ShoppingBag, Heart, ImageOff } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
    product: {
        id: string;
        name: string;
        slug?: string;
        price: number;
        compare_price?: number | null;
        in_stock?: boolean;
        image: string;
        category: string;
    };
    variant?: "white" | "cream"; // Context-aware background
    showHeart?: boolean; // Show heart icon for favorites
}

export function ProductCard({ product, variant = "white", showHeart = false }: ProductCardProps) {
    const { addToCart } = useCart();
    const [imageError, setImageError] = useState(false);

    // Use product image path directly - admin saves organized paths like /images/products/category/product/file.ext
    let imagePath = product.image || '';

    // Reject blob/data URLs and admin upload paths
    if (imagePath.startsWith('blob:') || imagePath.startsWith('data:')) {
      imagePath = '';
    }

    // Use the path as-is if it's a valid /images/ or https:// path, otherwise use placeholder
    const imageUrl = imagePath && (imagePath.startsWith('/images/') || imagePath.startsWith('https://'))
      ? imagePath
      : `https://placehold.co/600x800/E8657B/FFF?text=${encodeURIComponent(product.name.replace(/ /g, '+'))}`;

    const cardBg = variant === "cream" ? "bg-cream" : "bg-white";
    const borderColor = variant === "cream" ? "border-cream/50" : "border-cream/30";

    // Check if we have a valid image URL (not empty)
    const hasValidImage = !imageError && imageUrl && imageUrl.trim() !== '';

    // Discount calculation
    const hasDiscount = product.compare_price && product.compare_price > product.price;
    const discountPercent = hasDiscount
      ? Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100)
      : 0;

    const isOutOfStock = product.in_stock === false;

    return (
        <div className={`product-card group relative ${cardBg} rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 border ${borderColor} hover:border-coral/30 flex flex-col h-full`}>
            <Link href={`/product/${product.slug || product.id}`} className="product-card__image-link block relative aspect-[2/3] overflow-hidden bg-cream/30">
                {hasValidImage ? (
                    <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        className="product-card__image object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        onError={() => setImageError(true)}
                        unoptimized
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <ImageOff className="w-16 h-16 text-gray-400" />
                    </div>
                )}

                {/* Discount Badge */}
                {hasDiscount && !isOutOfStock && (
                    <div className="absolute top-3 left-3 bg-coral text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                        {discountPercent}% OFF
                    </div>
                )}

                {/* Out of Stock overlay */}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="bg-white/90 text-gray-700 text-sm font-bold px-4 py-2 rounded-full shadow">
                            Out of Stock
                        </span>
                    </div>
                )}

                <div className="product-card__quick-add absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {showHeart && (
                        <div className="product-card__heart-button bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md text-coral hover:text-coral-dark cursor-pointer">
                            <Heart className="w-5 h-5" />
                        </div>
                    )}
                    <div className="product-card__quick-add-button bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md text-coral hover:text-coral-dark cursor-pointer">
                        <ShoppingBag className="w-5 h-5" onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addToCart(product);
                        }} />
                    </div>
                </div>
            </Link>

            <div className={`product-card__content p-5 flex flex-col flex-grow ${cardBg} transition-colors`}>
                <p className="product-card__category text-xs text-text-muted font-semibold tracking-wider uppercase mb-2">{product.category}</p>
                <Link href={`/product/${product.slug || product.id}`} className="product-card__name-link flex-grow">
                    <h3 className="product-card__name font-bold text-lg text-text font-serif leading-tight hover:text-coral transition-colors line-clamp-2" title={product.name}>{product.name}</h3>
                </Link>
                <div className={`product-card__footer mt-4 pt-4 border-t ${borderColor} flex items-center justify-between`}>
                    <div className="product-card__pricing">
                        <span className="product-card__price font-bold text-xl text-orange font-serif">₹{product.price}</span>
                        {hasDiscount && (
                            <span className="product-card__compare-price text-sm text-text-muted line-through ml-2">₹{product.compare_price}</span>
                        )}
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className={`product-card__add-button rounded-full px-4 ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isOutOfStock}
                        onClick={(e) => {
                            e.preventDefault();
                            if (!isOutOfStock) addToCart(product);
                        }}
                    >
                        {isOutOfStock ? 'Sold Out' : 'Add'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
