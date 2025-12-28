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
            <div className="container-custom py-20 text-center">
                <h1 className="text-3xl font-bold mb-6 text-primary">Your Cart is Empty</h1>
                <p className="text-gray-600 mb-8">Looks like you haven't added any authentic mundus yet.</p>
                <Link href="/products">
                    <Button size="lg">Start Shopping</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 max-w-7xl py-12">
            <h1 className="text-3xl font-bold mb-8 text-primary">Your Shopping Cart</h1>

            <div className="grid lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-6">
                    {items.map((item) => (
                        <div key={item.id} className="flex gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 items-center">
                            <div className="relative w-20 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                <Image
                                    src={`https://placehold.co/600x800/800000/FFF?text=${encodeURIComponent(item.name.replace(/ /g, '+'))}`}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>

                            <div className="flex-1">
                                <Link href={`/product/${item.id}`} className="font-medium text-gray-900 hover:text-primary transition-colors line-clamp-2">
                                    {item.name}
                                </Link>
                                <div className="text-gray-500 text-sm mt-1">₹{item.price}</div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center border border-gray-300 rounded-md bg-white">
                                    <button
                                        className="p-1 hover:bg-gray-100 transition-colors text-primary"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                    >
                                        <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                    <button
                                        className="p-1 hover:bg-gray-100 transition-colors text-primary"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    >
                                        <Plus className="h-3 w-3" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="text-red-500 hover:text-red-600 text-sm flex items-center"
                                >
                                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 sticky top-24">
                        <h2 className="text-xl font-bold mb-6 text-gray-900">Order Summary</h2>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>₹{cartTotal}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Shipping</span>
                                <span className="text-green-600">Calculated on WhatsApp</span>
                            </div>
                            <div className="border-t pt-4 flex justify-between font-bold text-lg text-primary">
                                <span>Total</span>
                                <span>₹{cartTotal}</span>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white flex items-center justify-center gap-2 h-12"
                            onClick={handleWhatsAppCheckout}
                        >
                            Order on WhatsApp <MessageCircle className="h-5 w-5" />
                        </Button>
                        <p className="text-xs text-gray-500 text-center mt-4">
                            Clicking this will open WhatsApp with your order details pre-filled.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
