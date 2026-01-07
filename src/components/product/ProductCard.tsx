"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { ShoppingBag } from "lucide-react";

interface ProductCardProps {
    product: {
        id: string;
        name: string;
        price: number;
        image: string;
        category: string;
    };
    variant?: "white" | "cream"; // Context-aware background
}

export function ProductCard({ product, variant = "white" }: ProductCardProps) {
    const { addToCart } = useCart();

    // Use product image path, fallback to placeholder if not found
    const imageUrl = product.image || `https://placehold.co/600x800/E8657B/FFF?text=${encodeURIComponent(product.name.replace(/ /g, '+'))}`;

    const cardBg = variant === "cream" ? "bg-cream" : "bg-white";
    const borderColor = variant === "cream" ? "border-cream/50" : "border-cream/30";

    return (
        <div className={`product-card group relative ${cardBg} rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 border ${borderColor} hover:border-coral/30 flex flex-col h-full`}>
            <Link href={`/product/${product.id}`} className="product-card__image-link block relative aspect-[2/3] overflow-hidden bg-cream/30">
                <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    className="product-card__image object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />

                <div className="product-card__quick-add absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
                <Link href={`/product/${product.id}`} className="product-card__name-link flex-grow">
                    <h3 className="product-card__name font-bold text-lg text-text font-serif leading-tight hover:text-coral transition-colors line-clamp-2" title={product.name}>{product.name}</h3>
                </Link>
                <div className={`product-card__footer mt-4 pt-4 border-t ${borderColor} flex items-center justify-between`}>
                    <span className="product-card__price font-bold text-xl text-orange font-serif">₹{product.price}</span>
                    <Button
                        size="sm"
                        variant="outline"
                        className="product-card__add-button rounded-full px-4"
                        onClick={(e) => {
                            e.preventDefault();
                            addToCart(product);
                        }}
                    >
                        Add
                    </Button>
                </div>
            </div>
        </div>
    );
}

