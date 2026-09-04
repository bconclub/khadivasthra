"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { CartItem, ComboLineMeta } from "@/types";
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
  /** Set when this line is part of a configured combo. */
  combo?: ComboLineMeta;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: CartProduct, quantity?: number) => void;
    /** Add every piece of one configured combo as its own line, in one go. */
    addComboToCart: (lines: CartProduct[]) => void;
    removeFromCart: (id: string, variant_id?: string, combo_line?: string) => void;
    updateQuantity: (id: string, quantity: number, variant_id?: string, combo_line?: string) => void;
    /** Change how many of a whole combo are in the cart. */
    updateComboQuantity: (combo_line: string, quantity: number) => void;
    removeCombo: (combo_line: string) => void;
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

    // Two lines are the same cart line only when the product, the variant *and*
    // the combo they belong to all match. Without the combo part, a combo piece
    // would silently merge into a loose line of the same product and lose its
    // apportioned price.
    const sameLine = (item: CartItem, id: string, variant_id?: string, combo_line?: string) =>
        item.id === id &&
        item.variant_id === variant_id &&
        (item.combo?.combo_line ?? undefined) === combo_line;

    const openCart = useCallback(() => setIsCartOpen(true), []);
    const closeCart = useCallback(() => setIsCartOpen(false), []);

    const addToCart = (product: CartProduct, quantity = 1) => {
        // Cap a desired quantity to available stock when known (0 = unlimited/unknown).
        const cap = (desired: number) =>
            product.stock != null && product.stock > 0 ? Math.min(desired, product.stock) : desired;
        setItems((prev) => {
            const existingIndex = prev.findIndex((item) =>
                sameLine(item, product.id, product.variant_id, product.combo?.combo_line)
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
                    combo: product.combo,
                },
            ];
        });
        trackAddToCart({ id: product.id, name: product.name, price: product.price }, quantity);
        setIsCartOpen(true);
    };

    /**
     * A combo is added as one line per constituent product, each carrying the
     * same combo_line key and its share of the fixed combo price. Keeping real
     * product lines means stock decrement, the invoice, the packing sticker and
     * investor payouts all keep working with no combo-specific handling.
     */
    const addComboToCart = (lines: CartProduct[]) => {
        if (lines.length === 0) return;
        setItems((prev) => {
            let next = [...prev];
            for (const line of lines) {
                const idx = next.findIndex((item) =>
                    sameLine(item, line.id, line.variant_id, line.combo?.combo_line)
                );
                if (idx >= 0) {
                    next = next.map((item, i) =>
                        i === idx ? { ...item, quantity: item.quantity + 1 } : item
                    );
                } else {
                    next = [
                        ...next,
                        {
                            id: line.id,
                            name: line.name,
                            slug: line.slug,
                            price: line.price,
                            image: line.image,
                            quantity: 1,
                            variant_id: line.variant_id,
                            color_id: line.color_id,
                            color_name: line.color_name,
                            size: line.size,
                            stock: line.stock,
                            combo: line.combo,
                        },
                    ];
                }
            }
            return next;
        });
        const combo = lines[0].combo;
        if (combo) {
            trackAddToCart({ id: combo.combo_id, name: combo.combo_name, price: combo.combo_price }, 1);
        }
        setIsCartOpen(true);
    };

    const removeFromCart = (id: string, variant_id?: string, combo_line?: string) => {
        setItems((prev) => prev.filter((item) => !sameLine(item, id, variant_id, combo_line)));
    };

    /** A combo is bought as a set, so its pieces move together. */
    const updateComboQuantity = (combo_line: string, quantity: number) => {
        if (quantity < 1) return;
        setItems((prev) =>
            prev.map((item) =>
                item.combo?.combo_line === combo_line
                    ? {
                          ...item,
                          quantity:
                              item.stock != null && item.stock > 0
                                  ? Math.min(quantity, item.stock)
                                  : quantity,
                      }
                    : item
            )
        );
    };

    const removeCombo = (combo_line: string) => {
        setItems((prev) => prev.filter((item) => item.combo?.combo_line !== combo_line));
    };

    const updateQuantity = (id: string, quantity: number, variant_id?: string, combo_line?: string) => {
        if (quantity < 1) return;
        setItems((prev) =>
            prev.map((item) => {
                if (!sameLine(item, id, variant_id, combo_line)) return item;
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
            value={{ items, addToCart, addComboToCart, removeFromCart, updateQuantity, updateComboQuantity, removeCombo, clearCart, cartTotal, cartCount, isCartOpen, openCart, closeCart }}
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
