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
        return <div className="product-detail-page__error container mx-auto px-4 max-w-7xl py-20 text-center">Product not found</div>;
    }

    const relatedProducts = products
        .filter(p => p.category === product.category && p.id !== product.id)
        .slice(0, 4);

    const handleAddToCart = () => {
        addToCart(product, quantity);
    };

    // Use product image, fallback to placeholder if not found
    const imageUrl = product.image || `https://placehold.co/600x800/E8657B/FFF?text=${encodeURIComponent(product.name.replace(/ /g, '+'))}`;

    return (
        <div className="product-detail-page container mx-auto px-4 max-w-7xl py-12">
            <div className="product-detail-page__main grid md:grid-cols-2 gap-12 lg:gap-16 mb-20">
                {/* Gallery / Image */}
                <div className="product-detail-page__image-wrapper relative aspect-[3/4] bg-cream/30 rounded-2xl overflow-hidden shadow-lg border border-cream/30">
                    <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        className="product-detail-page__image object-cover"
                        priority
                    />
                </div>

                {/* Product Info */}
                <div className="product-detail-page__info flex flex-col h-full">
                    <div className="product-detail-page__header mb-6">
                        <span className="product-detail-page__category inline-block px-3 py-1 bg-cream/50 text-text-muted text-xs font-semibold uppercase tracking-wider rounded-full mb-3 border border-cream/30">
                            {product.category}
                        </span>
                        <h1 className="product-detail-page__title text-4xl md:text-5xl font-bold text-text leading-tight mb-2 font-serif">{product.name}</h1>
                        <div className="product-detail-page__price text-2xl font-semibold text-orange">₹{product.price}</div>
                    </div>

                    <p className="product-detail-page__description text-text-muted leading-relaxed text-lg mb-8">
                        {(product as any).longDescription || product.description}
                    </p>

                    <div className="product-detail-page__actions mt-auto space-y-8">
                        {/* Action Buttons */}
                        <div className="product-detail-page__action-card p-6 bg-white rounded-xl shadow-sm border border-cream/30">
                            <div className="product-detail-page__quantity-control flex items-center space-x-6 mb-6">
                                <span className="product-detail-page__quantity-label font-medium text-text">Quantity</span>
                                <div className="product-detail-page__quantity-selector flex items-center border border-cream/30 rounded-lg bg-white">
                                    <button
                                        className="product-detail-page__quantity-decrease p-3 hover:bg-cream/50 rounded-l-lg transition-all text-coral"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="product-detail-page__quantity-value w-12 text-center font-bold text-text">{quantity}</span>
                                    <button
                                        className="product-detail-page__quantity-increase p-3 hover:bg-cream/50 rounded-r-lg transition-all text-coral"
                                        onClick={() => setQuantity(quantity + 1)}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <Button
                                size="lg"
                                variant="primary"
                                className="product-detail-page__add-to-cart-btn w-full text-lg h-14 font-semibold shadow-lg shadow-coral/20 hover:shadow-coral/30 transition-all"
                                onClick={handleAddToCart}
                            >
                                <ShoppingBag className="mr-2 h-5 w-5" />
                                Add to Cart
                            </Button>
                        </div>

                        {/* Trust Badges */}
                        <div className="product-detail-page__trust-badges grid grid-cols-2 gap-4">
                            <div className="product-detail-page__trust-badge flex items-center space-x-3 text-sm text-text-muted bg-cream/50 p-3 rounded-lg border border-cream/30">
                                <Truck className="h-5 w-5 text-coral shrink-0" />
                                <span>Fast Delivery across Kerala</span>
                            </div>
                            <div className="product-detail-page__trust-badge flex items-center space-x-3 text-sm text-text-muted bg-cream/50 p-3 rounded-lg border border-cream/30">
                                <ShieldCheck className="h-5 w-5 text-coral shrink-0" />
                                <span>Authentic Quality Guaranteed</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Details Tabs */}
            <div className="product-detail-page__tabs mb-20">
                <div className="product-detail-page__tab-list flex border-b border-cream/30 mb-8 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab("details")}
                        className={cn(
                            "product-detail-page__tab product-detail-page__tab--details px-8 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                            activeTab === "details" ? "border-coral text-coral" : "border-transparent text-text-muted hover:text-text"
                        )}
                    >
                        Description
                    </button>
                    <button
                        onClick={() => setActiveTab("specs")}
                        className={cn(
                            "product-detail-page__tab product-detail-page__tab--specs px-8 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                            activeTab === "specs" ? "border-coral text-coral" : "border-transparent text-text-muted hover:text-text"
                        )}
                    >
                        Specifications
                    </button>
                    <button
                        onClick={() => setActiveTab("care")}
                        className={cn(
                            "product-detail-page__tab product-detail-page__tab--care px-8 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                            activeTab === "care" ? "border-coral text-coral" : "border-transparent text-text-muted hover:text-text"
                        )}
                    >
                        Material & Care
                    </button>
                </div>

                <div className="product-detail-page__tab-content bg-white p-8 md:p-12 rounded-2xl border border-cream/30 min-h-[300px]">
                    {activeTab === "details" && (
                        <div className="product-detail-page__tab-panel product-detail-page__tab-panel--details animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl">
                            <h3 className="product-detail-page__tab-title text-2xl font-bold text-text mb-6 flex items-center gap-3 font-serif">
                                <Info className="h-6 w-6 text-coral" />
                                Product Description
                            </h3>
                            <p className="product-detail-page__tab-description text-text-muted leading-loose text-lg">
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
                        <div className="product-detail-page__tab-panel product-detail-page__tab-panel--specs animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl">
                            <h3 className="product-detail-page__tab-title text-2xl font-bold text-text mb-6 flex items-center gap-3 font-serif">
                                <Ruler className="h-6 w-6 text-coral" />
                                Product Specifications
                            </h3>
                            <div className="product-detail-page__specs-grid grid md:grid-cols-2 gap-y-4 gap-x-12">
                                <div className="product-detail-page__spec-item flex justify-between py-3 border-b border-cream/30">
                                    <span className="product-detail-page__spec-label text-text-muted">Classification</span>
                                    <span className="product-detail-page__spec-value font-medium text-text">{(product as any).category}</span>
                                </div>
                                <div className="product-detail-page__spec-item flex justify-between py-3 border-b border-cream/30">
                                    <span className="product-detail-page__spec-label text-text-muted">Weave Type</span>
                                    <span className="product-detail-page__spec-value font-medium text-text">{(product as any).details?.weave || 'Handloom'}</span>
                                </div>
                                <div className="product-detail-page__spec-item flex justify-between py-3 border-b border-cream/30">
                                    <span className="product-detail-page__spec-label text-text-muted">Fit</span>
                                    <span className="product-detail-page__spec-value font-medium text-text">{(product as any).details?.fit || 'Regular Fit'}</span>
                                </div>
                                <div className="product-detail-page__spec-item flex justify-between py-3 border-b border-cream/30">
                                    <span className="product-detail-page__spec-label text-text-muted">Origin</span>
                                    <span className="product-detail-page__spec-value font-medium text-text">{(product as any).details?.origin || 'Aluva, Kerala'}</span>
                                </div>
                                <div className="product-detail-page__spec-item flex justify-between py-3 border-b border-cream/30">
                                    <span className="product-detail-page__spec-label text-text-muted">Dimensions</span>
                                    <span className="product-detail-page__spec-value font-medium text-text">{(product as any).details?.dimensions || 'Standard'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "care" && (
                        <div className="product-detail-page__tab-panel product-detail-page__tab-panel--care animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl">
                            <h3 className="product-detail-page__tab-title text-2xl font-bold text-text mb-6 flex items-center gap-3 font-serif">
                                <Droplets className="h-6 w-6 text-coral" />
                                Material & Care Instructions
                            </h3>
                            <div className="product-detail-page__care-content space-y-6">
                                <div className="product-detail-page__care-material">
                                    <h4 className="product-detail-page__care-subtitle font-bold text-text mb-2">Material</h4>
                                    <p className="product-detail-page__care-text text-text-muted">{(product as any).details?.material || '100% Cotton'}</p>
                                </div>
                                <div className="product-detail-page__care-instructions">
                                    <h4 className="product-detail-page__care-subtitle font-bold text-text mb-3">Care Instructions</h4>
                                    <ul className="product-detail-page__care-list grid md:grid-cols-2 gap-3">
                                        {((product as any).careInstructions || ['Hand wash cold', 'Dry in shade']).map((instruction: string, i: number) => (
                                            <li key={i} className="product-detail-page__care-item flex items-center gap-3 text-text-muted">
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

            {/* Related Products */}
            {relatedProducts.length > 0 && (
                <section className="product-detail-page__related border-t border-cream/30 pt-16">
                    <h2 className="product-detail-page__related-title text-3xl font-bold mb-10 text-text font-serif text-center">You May Also Like</h2>
                    <div className="product-detail-page__related-grid grid grid-cols-2 md:grid-cols-4 gap-6">
                        {relatedProducts.map(p => (
                            <ProductCard key={p.id} product={p} variant="white" />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
