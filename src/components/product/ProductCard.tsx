"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { Plus, ImageOff } from "lucide-react";
import { useState } from "react";
import { storageImage, IMG } from "@/lib/image";

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

export function ProductCard({ product }: ProductCardProps) {
    const { addToCart } = useCart();
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

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
        <div className="product-card group relative bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
            {/* Image Section */}
            <Link href={`/product/${product.slug || product.id}`} className="product-card__image-link block relative aspect-[4/5] overflow-hidden bg-cream/40">
                {hasValidImage ? (
                    <Image
                        src={storageImage(imageUrl, IMG.card)}
                        alt={product.name}
                        fill
                        // Fade in once decoded so a slow first load reads as the
                        // photo arriving, not as a broken/empty card.
                        className={`product-card__image object-cover scale-105 transition-all duration-700 group-hover:scale-110 ${
                            imageLoaded ? "opacity-100" : "opacity-0"
                        }`}
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        onError={() => setImageError(true)}
                        onLoad={() => setImageLoaded(true)}
                        unoptimized
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                        <ImageOff className="w-12 h-12 text-gray-300" />
                    </div>
                )}

                {/* Discount Badge — only badge on the image */}
                {hasDiscount && !isOutOfStock && (
                    <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-coral text-white text-[10px] md:text-[11px] font-bold px-2 py-0.5 md:px-2.5 md:py-1 rounded-full shadow-sm">
                        {discountPercent}% OFF
                    </div>
                )}

                {/* Out of Stock overlay */}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="bg-white text-gray-800 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                            Sold Out
                        </span>
                    </div>
                )}
            </Link>

            {/* Content Section */}
            <div className="product-card__content p-2.5 md:p-4 flex flex-col flex-grow">
                {/* Category label */}
                {product.category && (
                    <p className="product-card__category text-[9px] md:text-[10px] text-coral font-semibold tracking-widest uppercase mb-0.5 md:mb-1 truncate">
                        {product.category}
                    </p>
                )}

                <Link href={`/product/${product.slug || product.id}`} className="product-card__name-link flex-grow">
                    <h3 className="product-card__name font-semibold text-xs md:text-sm text-gray-900 leading-snug hover:text-coral transition-colors line-clamp-2">
                        {product.name}
                    </h3>
                </Link>

                {/* Price & Add to Cart Row */}
                <div className="product-card__footer mt-2 md:mt-3 flex items-center justify-between gap-1.5 md:gap-2">
                    <div className="product-card__pricing flex items-baseline gap-1 md:gap-1.5 min-w-0">
                        <span className="product-card__price font-bold text-sm md:text-base text-coral whitespace-nowrap">
                            ₹{product.price}
                        </span>
                        {hasDiscount && (
                            <span className="product-card__compare-price text-[10px] md:text-[11px] text-gray-400 line-through whitespace-nowrap">
                                ₹{product.compare_price}
                            </span>
                        )}
                    </div>
                    <button
                        className={`product-card__add-button flex-shrink-0 inline-flex items-center justify-center w-8 h-8 md:w-9 md:h-9 bg-coral text-white rounded-full hover:bg-coral-dark transition-colors shadow-sm ${
                            isOutOfStock ? 'opacity-40 pointer-events-none' : ''
                        }`}
                        disabled={isOutOfStock}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isOutOfStock) addToCart(product);
                        }}
                        aria-label={isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                    >
                        <Plus className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </div>
    );
}
