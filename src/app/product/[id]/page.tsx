"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { ProductCard } from "@/components/product/ProductCard";
import products from "@/data/products.json";
import { Minus, Plus, ShoppingBag, Truck, ShieldCheck } from "lucide-react";

export default function ProductDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const product = products.find(p => p.id === id);
    const [quantity, setQuantity] = useState(1);
    const { addToCart } = useCart();

    if (!product) {
        return <div className="container-custom py-20 text-center">Product not found</div>;
    }

    const relatedProducts = products
        .filter(p => p.category === product.category && p.id !== product.id)
        .slice(0, 4);

    const handleAddToCart = () => {
        addToCart(product, quantity);
        // Maybe show toast? For now, button visual feedback or just done.
    };

    // Demo hack: use placeholder service
    const imageUrl = `https://placehold.co/600x800/800000/FFF?text=${encodeURIComponent(product.name.replace(/ /g, '+'))}`;


    return (
        <div className="container-custom py-12">
            <div className="grid md:grid-cols-2 gap-12 mb-16">
                {/* Gallery / Image */}
                <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                    <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        priority
                    />
                </div>

                {/* Product Info */}
                <div className="space-y-6">
                    <div>
                        <span className="text-sm text-text-muted">{product.category}</span>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-1">{product.name}</h1>
                    </div>

                    <div className="text-3xl font-bold text-primary">₹{product.price}</div>

                    <p className="text-gray-600 leading-relaxed text-lg">
                        {product.description}
                    </p>

                    <div className="pt-8 border-t border-gray-100">
                        <div className="flex items-center space-x-4 mb-6">
                            <span className="font-medium text-gray-900">Quantity:</span>
                            <div className="flex items-center border border-gray-300 rounded-md bg-white">
                                <button
                                    className="p-3 hover:bg-gray-100 transition-colors text-primary"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                >
                                    <Minus className="h-4 w-4" />
                                </button>
                                <span className="w-12 text-center font-medium">{quantity}</span>
                                <button
                                    className="p-3 hover:bg-gray-100 transition-colors text-primary"
                                    onClick={() => setQuantity(quantity + 1)}
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex space-x-4">
                            <Button size="lg" className="flex-1 text-lg h-14" onClick={handleAddToCart}>
                                <ShoppingBag className="mr-2 h-5 w-5" />
                                Add to Cart
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6">
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                            <Truck className="h-5 w-5 text-primary" />
                            <span>Fast Delivery across Kerala</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            <span>Authentic Quality Guaranteed</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Related Products */}
            {relatedProducts.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold mb-8 text-primary">You May Also Like</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {relatedProducts.map(p => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
