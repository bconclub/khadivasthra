"use client";

import { useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { X, Plus, Minus, Trash2, ShoppingBag, ImageOff } from "lucide-react";
import { useState } from "react";

function DrawerItemImage({ src, alt }: { src: string; alt: string }) {
  const [imageError, setImageError] = useState(false);

  let imagePath = src || "";
  if (imagePath.startsWith("blob:") || imagePath.startsWith("data:")) {
    imagePath = "";
  }
  const imageUrl =
    imagePath &&
    (imagePath.startsWith("/images/") || imagePath.startsWith("https://"))
      ? imagePath
      : "";

  if (!imageUrl || imageError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        <ImageOff className="w-5 h-5 text-gray-400" />
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill
      className="object-cover"
      onError={() => setImageError(true)}
      unoptimized
    />
  );
}

export function CartDrawer() {
  const {
    items,
    updateQuantity,
    removeFromCart,
    cartTotal,
    cartCount,
    isCartOpen,
    closeCart,
  } = useCart();

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    if (isCartOpen) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [isCartOpen, closeCart]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300 ${
          isCartOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-coral" />
            <h2 className="text-lg font-bold text-text">
              Your Cart{" "}
              {cartCount > 0 && (
                <span className="text-sm font-normal text-text-muted">
                  ({cartCount} {cartCount === 1 ? "item" : "items"})
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-text-muted font-medium mb-2">
                Your cart is empty
              </p>
              <p className="text-sm text-text-muted mb-6">
                Add some beautiful mundus to get started
              </p>
              <Button variant="primary" size="sm" onClick={closeCart}>
                <Link href="/shop">Continue Shopping</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.id}${item.variant_id ? `-${item.variant_id}` : ''}`}
                  className="flex gap-3 p-3 bg-cream/30 rounded-lg"
                >
                  {/* Image */}
                  <div className="relative w-16 h-20 rounded-md overflow-hidden flex-shrink-0 bg-gray-100">
                    <DrawerItemImage src={item.image} alt={item.name} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${item.slug || item.id}`}
                      onClick={closeCart}
                      className="text-sm font-medium text-text hover:text-coral transition-colors line-clamp-2 leading-tight"
                    >
                      {item.name}
                    </Link>
                    {(item.color || item.size) && (
                      <p className="text-xs text-text-muted mt-0.5">
                        {item.color && `Color: ${item.color}`}
                        {item.color && item.size && " / "}
                        {item.size && `Size: ${item.size}`}
                      </p>
                    )}
                    <p className="text-orange font-bold text-sm mt-1">
                      ₹{item.price}
                    </p>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-gray-200 rounded-md bg-white">
                        <button
                          className="p-1.5 hover:bg-gray-50 transition-colors text-gray-500 disabled:opacity-30"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1, item.variant_id)
                          }
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-semibold text-text">
                          {item.quantity}
                        </span>
                        <button
                          className="p-1.5 hover:bg-gray-50 transition-colors text-gray-500"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1, item.variant_id)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-text">
                          ₹{item.price * item.quantity}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.id, item.variant_id)}
                          className="text-gray-400 hover:text-coral transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - only show when items exist */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-4 space-y-3 bg-white">
            <div className="flex justify-between items-center">
              <span className="text-text-muted text-sm">Subtotal</span>
              <span className="text-lg font-bold text-orange">
                ₹{cartTotal.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Shipping calculated at checkout
            </p>
            <Link href="/checkout" onClick={closeCart} className="block">
              <Button
                variant="primary"
                size="lg"
                className="w-full h-12 text-base font-semibold"
              >
                Checkout - ₹{cartTotal.toLocaleString()}
              </Button>
            </Link>
            <button
              onClick={closeCart}
              className="w-full text-center text-sm text-coral hover:underline py-1"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
