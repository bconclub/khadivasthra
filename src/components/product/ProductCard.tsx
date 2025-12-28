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
}

export function ProductCard({ product }: ProductCardProps) {
    const { addToCart } = useCart();

    // Demo hack: use placeholder service
    const imageUrl = `https://placehold.co/600x800/800000/FFF?text=${encodeURIComponent(product.name.replace(/ /g, '+'))}`;

    return (
        <div className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col h-full">
            <Link href={`/product/${product.id}`} className="block relative aspect-[3/4] overflow-hidden bg-gray-100">
                <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
                {/* Quick Add Overlay - only visible on hover on desktop */}
                <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex justify-center bg-gradient-to-t from-black/60 to-transparent">
                    <Button
                        size="sm"
                        className="w-full bg-white text-primary hover:bg-gray-100 border-none"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addToCart(product);
                        }}
                    >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Add to Cart
                    </Button>
                </div>
            </Link>

            <div className="p-4 flex flex-col flex-grow">
                <p className="text-xs text-text-muted mb-1">{product.category}</p>
                <Link href={`/product/${product.id}`} className="flex-grow">
                    <h3 className="font-medium text-text hover:text-primary transition-colors line-clamp-2" title={product.name}>{product.name}</h3>
                </Link>
                <div className="mt-3 flex items-center justify-between">
                    <span className="font-bold text-lg text-primary">₹{product.price}</span>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="md:hidden text-primary h-8 w-8"
                        onClick={(e) => {
                            e.preventDefault();
                            addToCart(product);
                        }}
                    >
                        <ShoppingBag className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
