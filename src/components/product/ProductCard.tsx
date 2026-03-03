"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { ArrowUpRight, ImageOff } from "lucide-react";
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
    variant?: "white" | "cream";
    showHeart?: boolean;
}

export function ProductCard({ product, variant = "white" }: ProductCardProps) {
    const { addToCart } = useCart();
    const [imageError, setImageError] = useState(false);

    let imagePath = product.image || '';
    if (imagePath.startsWith('blob:') || imagePath.startsWith('data:')) {
      imagePath = '';
    }

    const imageUrl = imagePath && (imagePath.startsWith('/images/') || imagePath.startsWith('https://'))
      ? imagePath
      : `https://placehold.co/600x800/E8657B/FFF?text=${encodeURIComponent(product.name.replace(/ /g, '+'))}`;

    const hasValidImage = !imageError && imageUrl && imageUrl.trim() !== '';

    const hasDiscount = product.compare_price && product.compare_price > product.price;
    const discountPercent = hasDiscount
      ? Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100)
      : 0;

    const isOutOfStock = product.in_stock === false;

    return (
        <div className="product-card group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
            {/* Image Section */}
            <Link href={`/product/${product.slug || product.id}`} className="product-card__image-link block relative aspect-[4/5] overflow-hidden bg-cream/20">
                {hasValidImage ? (
                    <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        className="product-card__image object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        onError={() => setImageError(true)}
                        unoptimized
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                        <ImageOff className="w-12 h-12 text-gray-300" />
                    </div>
                )}

                {/* Discount Badge */}
                {hasDiscount && !isOutOfStock && (
                    <div className="absolute top-3 left-3 bg-coral text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                        {discountPercent}% OFF
                    </div>
                )}

                {/* Best Seller / Category Badge */}
                {product.category && (
                    <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm text-gray-700 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wider">
                        {product.category}
                    </div>
                )}

                {/* Out of Stock overlay */}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="bg-white text-gray-800 text-xs font-bold px-5 py-2 rounded-full shadow-lg">
                            Sold Out
                        </span>
                    </div>
                )}
            </Link>

            {/* Content Section */}
            <div className="product-card__content p-3.5 md:p-4 flex flex-col flex-grow">
                <Link href={`/product/${product.slug || product.id}`} className="product-card__name-link flex-grow">
                    <h3 className="product-card__name font-semibold text-[13px] md:text-sm text-gray-900 leading-snug hover:text-coral transition-colors line-clamp-2">
                        {product.name}
                    </h3>
                </Link>

                {/* Price & Buy Button Row */}
                <div className="product-card__footer mt-3 flex items-center justify-between gap-2">
                    <div className="product-card__pricing flex items-baseline gap-1.5">
                        <span className="product-card__price bg-gray-100 text-gray-900 font-bold text-sm px-3 py-1 rounded-full">
                            ₹{product.price}
                        </span>
                        {hasDiscount && (
                            <span className="product-card__compare-price text-[11px] text-gray-400 line-through">
                                ₹{product.compare_price}
                            </span>
                        )}
                    </div>
                    <button
                        className={`product-card__buy-button inline-flex items-center gap-1 bg-gray-900 text-white text-xs font-medium pl-3 pr-2 py-1.5 rounded-full hover:bg-coral transition-colors ${
                            isOutOfStock ? 'opacity-40 pointer-events-none' : ''
                        }`}
                        disabled={isOutOfStock}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isOutOfStock) addToCart(product);
                        }}
                    >
                        {isOutOfStock ? 'Sold Out' : 'Buy Now'}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
