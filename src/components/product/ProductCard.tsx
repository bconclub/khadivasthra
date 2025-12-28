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
    const imageUrl = `https://placehold.co/600x800/8B1538/FFF?text=${encodeURIComponent(product.name.replace(/ /g, '+'))}`;

    return (
        <div className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-secondary-dark flex flex-col h-full">
            <Link href={`/product/${product.id}`} className="block relative aspect-[3/4] overflow-hidden bg-secondary">
                <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />

                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md text-primary hover:text-accent cursor-pointer">
                        <ShoppingBag className="w-5 h-5" onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addToCart(product);
                        }} />
                    </div>
                </div>
            </Link>

            <div className="p-5 flex flex-col flex-grow bg-white group-hover:bg-secondary/20 transition-colors">
                <p className="text-xs text-primary font-semibold tracking-wider uppercase mb-2">{product.category}</p>
                <Link href={`/product/${product.id}`} className="flex-grow">
                    <h3 className="font-bold text-lg text-primary-dark font-serif leading-tight hover:text-accent transition-colors line-clamp-2" title={product.name}>{product.name}</h3>
                </Link>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="font-bold text-xl text-primary font-serif">₹{product.price}</span>
                    <Button
                        size="sm"
                        className="bg-transparent hover:bg-primary text-primary hover:text-white border border-primary rounded-full px-4 transition-all"
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

