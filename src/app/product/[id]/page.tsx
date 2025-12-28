"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { ProductCard } from "@/components/product/ProductCard";
import products from "@/data/products.json";
import { Minus, Plus, ShoppingBag, Truck, ShieldCheck, Ruler, Droplets, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProductDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const product = products.find(p => p.id === id);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<"details" | "specs" | "care">("details");
    const { addToCart } = useCart();

    if (!product) {
        return <div className="container mx-auto px-4 max-w-7xl py-20 text-center">Product not found</div>;
    }

    const relatedProducts = products
        .filter(p => p.category === product.category && p.id !== product.id)
        .slice(0, 4);

    const handleAddToCart = () => {
        addToCart(product, quantity);
    };

    // Demo hack: use placeholder service
    const imageUrl = `https://placehold.co/600x800/8B1538/FFF?text=${encodeURIComponent(product.name.replace(/ /g, '+'))}`;

    return (
        <div className="container mx-auto px-4 max-w-7xl py-12">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 mb-20">
                {/* Gallery / Image */}
                <div className="relative aspect-[3/4] bg-secondary-dark rounded-2xl overflow-hidden shadow-lg border-2 border-primary/5">
                    <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        priority
                    />
                </div>

                {/* Product Info */}
                <div className="flex flex-col h-full">
                    <div className="mb-6">
                        <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider rounded-full mb-3">
                            {product.category}
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold text-text-heading leading-tight mb-2 font-serif">{product.name}</h1>
                        <div className="text-2xl font-semibold text-primary">₹{product.price}</div>
                    </div>

                    <p className="text-text leading-relaxed text-lg mb-8">
                        {(product as any).longDescription || product.description}
                    </p>

                    <div className="mt-auto space-y-8">
                        {/* Action Buttons */}
                        <div className="p-6 bg-white rounded-xl shadow-sm border border-secondary-dark">
                            <div className="flex items-center space-x-6 mb-6">
                                <span className="font-medium text-text-heading">Quantity</span>
                                <div className="flex items-center border border-gray-200 rounded-lg bg-secondary">
                                    <button
                                        className="p-3 hover:bg-white hover:shadow-sm rounded-l-lg transition-all text-primary"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-12 text-center font-bold text-text-heading">{quantity}</span>
                                    <button
                                        className="p-3 hover:bg-white hover:shadow-sm rounded-r-lg transition-all text-primary"
                                        onClick={() => setQuantity(quantity + 1)}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <Button
                                size="lg"
                                className="w-full text-lg h-14 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all bg-accent hover:bg-accent/90 border-none text-white"
                                onClick={handleAddToCart}
                            >
                                <ShoppingBag className="mr-2 h-5 w-5" />
                                Add to Cart
                            </Button>
                        </div>

                        {/* Trust Badges */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3 text-sm text-text bg-secondary p-3 rounded-lg">
                                <Truck className="h-5 w-5 text-primary shrink-0" />
                                <span>Fast Delivery across Kerala</span>
                            </div>
                            <div className="flex items-center space-x-3 text-sm text-text bg-secondary p-3 rounded-lg">
                                <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                                <span>Authentic Quality Guaranteed</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Details Tabs */}
            <div className="mb-20">
                <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab("details")}
                        className={cn(
                            "px-8 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                            activeTab === "details" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-heading"
                        )}
                    >
                        Description
                    </button>
                    <button
                        onClick={() => setActiveTab("specs")}
                        className={cn(
                            "px-8 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                            activeTab === "specs" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-heading"
                        )}
                    >
                        Specifications
                    </button>
                    <button
                        onClick={() => setActiveTab("care")}
                        className={cn(
                            "px-8 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                            activeTab === "care" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-heading"
                        )}
                    >
                        Material & Care
                    </button>
                </div>

                <div className="bg-white p-8 md:p-12 rounded-2xl border border-secondary-dark min-h-[300px]">
                    {activeTab === "details" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl">
                            <h3 className="text-2xl font-bold text-text-heading mb-6 flex items-center gap-3 font-serif">
                                <Info className="h-6 w-6 text-gold" />
                                Product Description
                            </h3>
                            <p className="text-text leading-loose text-lg">
                                {(product as any).longDescription || product.description}
                                <br /><br />
                                Our collection reflects the timeless beauty of Kerala's handloom tradition.
                                Whether it is for a wedding, a festival, or daily wear, this mundu is designed to
                                give you elegance and comfort. The fabric is soft against the skin and allows for
                                free movement, making it perfect for the tropical climate.
                            </p>
                        </div>
                    )}

                    {activeTab === "specs" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl">
                            <h3 className="text-2xl font-bold text-text-heading mb-6 flex items-center gap-3 font-serif">
                                <Ruler className="h-6 w-6 text-gold" />
                                Product Specifications
                            </h3>
                            <div className="grid md:grid-cols-2 gap-y-4 gap-x-12">
                                <div className="flex justify-between py-3 border-b border-gray-100">
                                    <span className="text-text-muted">Classification</span>
                                    <span className="font-medium text-text-heading">{(product as any).category}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-gray-100">
                                    <span className="text-text-muted">Weave Type</span>
                                    <span className="font-medium text-text-heading">{(product as any).details?.weave || 'Handloom'}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-gray-100">
                                    <span className="text-text-muted">Fit</span>
                                    <span className="font-medium text-text-heading">{(product as any).details?.fit || 'Regular Fit'}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-gray-100">
                                    <span className="text-text-muted">Origin</span>
                                    <span className="font-medium text-text-heading">{(product as any).details?.origin || 'Aluva, Kerala'}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-gray-100">
                                    <span className="text-text-muted">Dimensions</span>
                                    <span className="font-medium text-text-heading">{(product as any).details?.dimensions || 'Standard'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "care" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl">
                            <h3 className="text-2xl font-bold text-text-heading mb-6 flex items-center gap-3 font-serif">
                                <Droplets className="h-6 w-6 text-gold" />
                                Material & Care Instructions
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-bold text-text-heading mb-2">Material</h4>
                                    <p className="text-text">{(product as any).details?.material || '100% Cotton'}</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-text-heading mb-3">Care Instructions</h4>
                                    <ul className="grid md:grid-cols-2 gap-3">
                                        {((product as any).careInstructions || ['Hand wash cold', 'Dry in shade']).map((instruction: string, i: number) => (
                                            <li key={i} className="flex items-center gap-3 text-text">
                                                <span className="h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
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
            {relatedProducts.length > 0 && (
                <section className="border-t border-gray-100 pt-16">
                    <h2 className="text-3xl font-bold mb-10 text-primary font-serif text-center">You May Also Like</h2>
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
