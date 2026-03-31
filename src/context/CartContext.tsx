"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { CartItem } from "@/types";
import { trackAddToCart } from "@/lib/fbq";

export type { CartItem };

interface CartProduct {
  id: string;
  name: string;
  slug?: string;
  price: number;
  image: string;
  variant_id?: string;
  color?: string;
  size?: string;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: CartProduct, quantity?: number) => void;
    removeFromCart: (id: string, variant_id?: string) => void;
    updateQuantity: (id: string, quantity: number, variant_id?: string) => void;
    clearCart: () => void;
    cartTotal: number;
    cartCount: number;
    isCartOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Load from local storage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedCart = localStorage.getItem("khadi_cart");
            if (savedCart) {
                try {
                    const parsed = JSON.parse(savedCart);
                    if (Array.isArray(parsed)) {
                        setItems(parsed as CartItem[]);
                    }
                } catch (e) {
                    console.error("Failed to parse cart", e);
                }
            }
            setIsLoaded(true);
        }
    }, []);

    // Save to local storage on change
    useEffect(() => {
        if (isLoaded && typeof window !== "undefined") {
            localStorage.setItem("khadi_cart", JSON.stringify(items));
        }
    }, [items, isLoaded]);

    const openCart = useCallback(() => setIsCartOpen(true), []);
    const closeCart = useCallback(() => setIsCartOpen(false), []);

    const getItemKey = (id: string, variant_id?: string) => `${id}${variant_id ? `::${variant_id}` : ''}`;

    const addToCart = (product: CartProduct, quantity = 1) => {
        setItems((prev) => {
            const existingIndex = prev.findIndex(
                (item) => item.id === product.id && item.variant_id === product.variant_id
            );
            if (existingIndex >= 0) {
                return prev.map((item, idx) =>
                    idx === existingIndex
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [
                ...prev,
                {
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    image: product.image,
                    quantity,
                    variant_id: product.variant_id,
                    color: product.color,
                    size: product.size,
                },
            ];
        });
        trackAddToCart({ id: product.id, name: product.name, price: product.price }, quantity);
        setIsCartOpen(true);
    };

    const removeFromCart = (id: string, variant_id?: string) => {
        setItems((prev) => prev.filter((item) => !(item.id === id && item.variant_id === variant_id)));
    };

    const updateQuantity = (id: string, quantity: number, variant_id?: string) => {
        if (quantity < 1) return;
        setItems((prev) =>
            prev.map((item) => (item.id === id && item.variant_id === variant_id ? { ...item, quantity } : item))
        );
    };

    const clearCart = () => {
        setItems([]);
    };

    const cartTotal = items.reduce(
        (total, item) => total + item.price * item.quantity,
        0
    );

    const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <CartContext.Provider
            value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount, isCartOpen, openCart, closeCart }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
