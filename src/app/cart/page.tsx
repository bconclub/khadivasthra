"use client";

import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus, MessageCircle } from "lucide-react";

export default function CartPage() {
    const { items, updateQuantity, removeFromCart, cartTotal } = useCart();

    const handleWhatsAppCheckout = () => {
        const phoneNumber = "919745512345"; // Replace with actual number

        let message = "Hi, I want to order:\n\n";
        items.forEach(item => {
            message += `- ${item.name} x ${item.quantity} - ₹${item.price * item.quantity}\n`;
        });
        message += `\nTotal: ₹${cartTotal}`;

        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank");
    };

    if (items.length === 0) {
        return (
            <div className="cart-page cart-page--empty container mx-auto px-4 max-w-7xl py-20 text-center">
                <h1 className="cart-page__empty-title text-3xl font-bold mb-6 text-text">Your Cart is Empty</h1>
                <p className="cart-page__empty-message text-text-muted mb-8">Looks like you haven't added any authentic mundus yet.</p>
                <Link href="/products" className="cart-page__empty-cta">
                    <Button size="lg" variant="primary">Start Shopping</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="cart-page container mx-auto px-4 max-w-7xl py-12">
            <h1 className="cart-page__title text-3xl font-bold mb-8 text-text">Your Shopping Cart</h1>

            <div className="cart-page__content grid lg:grid-cols-3 gap-12">
                <div className="cart-page__items lg:col-span-2 space-y-6">
                    {items.map((item) => (
                        <div key={item.id} className="cart-page__item flex gap-4 p-4 bg-white rounded-lg shadow-sm border border-cream/30 items-center">
                            <div className="cart-page__item-image-wrapper relative w-20 h-24 bg-cream/30 rounded-md overflow-hidden flex-shrink-0">
                                <Image
                                    src={`https://placehold.co/600x800/E8657B/FFF?text=${encodeURIComponent(item.name.replace(/ /g, '+'))}`}
                                    alt={item.name}
                                    fill
                                    className="cart-page__item-image object-cover"
                                />
                            </div>

                            <div className="cart-page__item-info flex-1">
                                <Link href={`/product/${item.slug || item.id}`} className="cart-page__item-name font-medium text-text hover:text-coral transition-colors line-clamp-2">
                                    {item.name}
                                </Link>
                                <div className="cart-page__item-price text-orange text-sm mt-1 font-semibold">₹{item.price}</div>
                            </div>

                            <div className="cart-page__item-controls flex flex-col items-end gap-2">
                                <div className="cart-page__item-quantity flex items-center border border-cream/30 rounded-md bg-white">
                                    <button
                                        className="cart-page__item-quantity-decrease p-1 hover:bg-cream/50 transition-colors text-coral"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                    >
                                        <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="cart-page__item-quantity-value w-8 text-center text-sm font-medium text-text">{item.quantity}</span>
                                    <button
                                        className="cart-page__item-quantity-increase p-1 hover:bg-cream/50 transition-colors text-coral"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    >
                                        <Plus className="h-3 w-3" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="cart-page__item-remove text-text-muted hover:text-coral text-sm flex items-center"
                                >
                                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="cart-page__summary lg:col-span-1">
                    <div className="cart-page__summary-card bg-white p-6 rounded-lg shadow-sm border border-cream/30 sticky top-24">
                        <h2 className="cart-page__summary-title text-xl font-bold mb-6 text-text">Order Summary</h2>

                        <div className="cart-page__summary-details space-y-4 mb-6">
                            <div className="cart-page__summary-row flex justify-between text-text-muted">
                                <span className="cart-page__summary-label">Subtotal</span>
                                <span className="cart-page__summary-value">₹{cartTotal}</span>
                            </div>
                            <div className="cart-page__summary-row flex justify-between text-text-muted">
                                <span className="cart-page__summary-label">Shipping</span>
                                <span className="cart-page__summary-value text-green-600">Calculated on WhatsApp</span>
                            </div>
                            <div className="cart-page__summary-total border-t border-cream/30 pt-4 flex justify-between font-bold text-lg text-orange">
                                <span className="cart-page__summary-total-label">Total</span>
                                <span className="cart-page__summary-total-value">₹{cartTotal}</span>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            variant="secondary"
                            className="cart-page__checkout-btn w-full flex items-center justify-center gap-2 h-12"
                            onClick={handleWhatsAppCheckout}
                        >
                            Order on WhatsApp <MessageCircle className="h-5 w-5" />
                        </Button>
                        <p className="cart-page__checkout-note text-xs text-text-muted text-center mt-4">
                            Clicking this will open WhatsApp with your order details pre-filled.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
