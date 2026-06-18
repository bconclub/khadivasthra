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
  color_id?: string;
  color_name?: string;
  size?: string;
  /** Available stock for this product/variant — caps how many can be added. */
  stock?: number;
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

    const addToCart = (product: CartProduct, quantity = 1) => {
        // Cap a desired quantity to available stock when known (0 = unlimited/unknown).
        const cap = (desired: number) =>
            product.stock != null && product.stock > 0 ? Math.min(desired, product.stock) : desired;
        setItems((prev) => {
            const existingIndex = prev.findIndex(
                (item) => item.id === product.id && item.variant_id === product.variant_id
            );
            if (existingIndex >= 0) {
                return prev.map((item, idx) =>
                    idx === existingIndex
                        ? {
                              ...item,
                              // refresh known stock, then cap the cumulative quantity to it
                              stock: product.stock ?? item.stock,
                              quantity: cap(item.quantity + quantity),
                          }
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
                    quantity: cap(quantity),
                    variant_id: product.variant_id,
                    color_id: product.color_id,
                    color_name: product.color_name,
                    size: product.size,
                    stock: product.stock,
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
            prev.map((item) => {
                if (item.id !== id || item.variant_id !== variant_id) return item;
                // never let the quantity exceed known stock
                const capped = item.stock != null && item.stock > 0 ? Math.min(quantity, item.stock) : quantity;
                return { ...item, quantity: capped };
            })
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
