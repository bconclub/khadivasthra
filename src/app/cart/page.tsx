"use client";

import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus, MessageCircle, ShoppingBag, ImageOff } from "lucide-react";
import { useEffect, useState } from "react";
import { groupCart } from "@/lib/combo";
import { getProducts } from "@/lib/services/products";
import type { CartItem } from "@/types";

type ProposedCart = { id: string; items: CartItem[]; changed: boolean };

function CartItemImage({ src, alt }: { src: string; alt: string }) {
  const [imageError, setImageError] = useState(false);

  let imagePath = src || '';
  if (imagePath.startsWith('blob:') || imagePath.startsWith('data:')) {
    imagePath = '';
  }
  const imageUrl = imagePath && (imagePath.startsWith('/images/') || imagePath.startsWith('https://'))
    ? imagePath
    : '';

  if (!imageUrl || imageError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        <ImageOff className="w-8 h-8 text-gray-400" />
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

export default function CartPage() {
    const { items, mergeAssistedCart, updateQuantity, removeFromCart, updateComboQuantity, removeCombo, cartTotal } = useCart();
    const [proposal, setProposal] = useState<ProposedCart | null>(null);
    const [proposalError, setProposalError] = useState("");
    const [loadingProposal, setLoadingProposal] = useState(false);

    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get("cart");
        if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
        let cancelled = false;
        queueMicrotask(() => { if (!cancelled) setLoadingProposal(true); });
        const api = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/assisted-cart?id=${encodeURIComponent(id)}`;
        fetch(api, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` } })
            .then(async response => {
                if (!response.ok) throw new Error("This cart link is unavailable. Please ask us for a new one.");
                const saved = await response.json() as { items: { id: string; variant_id?: string | null; quantity: number }[] };
                const catalog = await getProducts();
                const lines: CartItem[] = [];
                let changed = false;
                for (const line of saved.items) {
                    const product = catalog.find(item => item.id === line.id && !item.is_wholesale);
                    if (!product) { changed = true; continue; }
                    const variant = line.variant_id ? product.variants?.find(item => item.id === line.variant_id && item.is_active) : undefined;
                    if (product.has_variants && !variant) { changed = true; continue; }
                    if (!product.has_variants && line.variant_id) { changed = true; continue; }
                    const stock = variant ? variant.stock_quantity : product.stock_quantity;
                    if (!product.in_stock || stock < 1) { changed = true; continue; }
                    const quantity = Math.min(line.quantity, stock);
                    if (quantity !== line.quantity) changed = true;
                    lines.push({ id: product.id, name: product.name, slug: product.slug, price: product.price + (variant?.price_adjustment || 0), image: variant?.color?.images?.[0] || product.image_url || product.images?.[0] || "", quantity, variant_id: variant?.id, color_id: variant?.color_id, color_name: variant?.color?.name, size: variant?.size, stock });
                }
                if (!cancelled) setProposal({ id, items: lines, changed });
            })
            .catch(error => { if (!cancelled) setProposalError(error instanceof Error ? error.message : "Could not load cart."); })
            .finally(() => { if (!cancelled) setLoadingProposal(false); });
        return () => { cancelled = true; };
    }, []);

    const acceptProposal = () => {
        if (!proposal) return;
        mergeAssistedCart(proposal.items);
        sessionStorage.setItem("kv_assisted_cart_id", proposal.id);
        setProposal(null);
    };

    const proposalPanel = loadingProposal || proposal || proposalError ? (
        <div className="mb-8 rounded-lg border border-coral/30 bg-white p-5" role="status">
            {loadingProposal && <p>Loading your saved cart...</p>}
            {proposalError && <p className="text-coral">{proposalError}</p>}
            {proposal && <>
                <h2 className="text-xl font-semibold mb-2">Review your saved cart</h2>
                <p className="text-sm text-text-muted mb-4">Check current products and prices before adding them to your cart. Final shipping and total appear at checkout.</p>
                {proposal.changed && <p className="text-coral mb-3">Some items or quantities changed because stock is no longer available.</p>}
                {proposal.items.map(line => <div key={`${line.id}:${line.variant_id || ""}`} className="flex justify-between gap-4 py-2 border-t border-cream/30"><span>{line.name}{line.color_name ? `, ${line.color_name}` : ""}{line.size ? `, ${line.size}` : ""} × {line.quantity}</span><span>₹{line.price * line.quantity}</span></div>)}
                {proposal.items.length > 0 && <Button className="mt-4" onClick={acceptProposal}>Add these items to cart</Button>}
                {proposal.items.length === 0 && <Link href="/shop" className="text-coral underline">Browse available products</Link>}
            </>}
        </div>
    ) : null;

    const handleWhatsAppCheckout = () => {
        const phoneNumber = "918714090510";

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
                <h1 className="cart-page__empty-title text-3xl font-bold mb-6 text-text">{proposal || loadingProposal ? "Your Saved Cart" : "Your Cart is Empty"}</h1>
                {!proposal && !loadingProposal && <p className="cart-page__empty-message text-text-muted mb-8">No items in your cart yet.</p>}
                {proposalPanel}
                {(!proposal || proposal.items.length === 0) && <Link href="/shop" className="cart-page__empty-cta">
                    <Button size="lg" variant="primary">Start Shopping</Button>
                </Link>}
            </div>
        );
    }

    return (
        <div className="cart-page container mx-auto px-4 max-w-7xl py-12">
            <h1 className="cart-page__title text-3xl font-bold mb-8 text-text">Your Shopping Cart</h1>
            {proposalPanel}

            <div className="cart-page__content grid lg:grid-cols-3 gap-12">
                <div className="cart-page__items lg:col-span-2 space-y-6">
                    {groupCart(items).map((group) =>
                        group.kind === "combo" ? (
                            <div
                                key={group.key}
                                className="cart-page__combo p-4 bg-white rounded-lg shadow-sm border border-coral/30"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <span className="inline-block px-2 py-0.5 rounded-full bg-coral/10 text-coral text-[10px] font-semibold uppercase tracking-wider mb-1">
                                            Combo
                                        </span>
                                        <h3 className="font-medium text-text">{group.combo.combo_name}</h3>
                                    </div>
                                    <div className="text-orange font-semibold">
                                        ₹{group.combo.combo_price * group.quantity}
                                    </div>
                                </div>

                                {/* The pieces still ship, pack and count as individual products. */}
                                <div className="flex flex-wrap gap-3 mb-3">
                                    {group.lines.map((line, i) => (
                                        <div key={`${line.id}-${line.variant_id ?? ""}-${i}`} className="flex gap-2 items-center">
                                            <div className="relative w-12 h-14 bg-cream/30 rounded-md overflow-hidden flex-shrink-0">
                                                <CartItemImage src={line.image} alt={line.name} />
                                            </div>
                                            <div className="text-xs">
                                                <p className="text-text line-clamp-1 max-w-[9rem]">{line.name}</p>
                                                {(line.color_name || line.size) && (
                                                    <p className="text-text-muted">
                                                        {[line.color_name, line.size].filter(Boolean).join(" / ")}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between border-t border-cream/40 pt-3">
                                    <div className="flex items-center border border-cream/30 rounded-md bg-white">
                                        <button
                                            className="p-1 hover:bg-cream/50 transition-colors text-coral"
                                            onClick={() => updateComboQuantity(group.key, group.quantity - 1)}
                                            disabled={group.quantity <= 1}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="w-8 text-center text-sm font-medium text-text">{group.quantity}</span>
                                        <button
                                            className="p-1 hover:bg-cream/50 transition-colors text-coral"
                                            onClick={() => updateComboQuantity(group.key, group.quantity + 1)}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => removeCombo(group.key)}
                                        className="text-text-muted hover:text-coral text-sm flex items-center"
                                    >
                                        <Trash2 className="h-3 w-3 mr-1" /> Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                        <div key={group.key} className="cart-page__item flex gap-4 p-4 bg-white rounded-lg shadow-sm border border-cream/30 items-center">
                            <div className="cart-page__item-image-wrapper relative w-20 h-24 bg-cream/30 rounded-md overflow-hidden flex-shrink-0">
                                <CartItemImage src={group.item.image} alt={group.item.name} />
                            </div>

                            <div className="cart-page__item-info flex-1">
                                <Link href={`/product/${group.item.slug || group.item.id}`} className="cart-page__item-name font-medium text-text hover:text-coral transition-colors line-clamp-2">
                                    {group.item.name}
                                </Link>
                                <div className="cart-page__item-price text-orange text-sm mt-1 font-semibold">₹{group.item.price}</div>
                            </div>

                            <div className="cart-page__item-controls flex flex-col items-end gap-2">
                                <div className="cart-page__item-quantity flex items-center border border-cream/30 rounded-md bg-white">
                                    <button
                                        className="cart-page__item-quantity-decrease p-1 hover:bg-cream/50 transition-colors text-coral"
                                        onClick={() => updateQuantity(group.item.id, group.item.quantity - 1, group.item.variant_id)}
                                        disabled={group.item.quantity <= 1}
                                    >
                                        <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="cart-page__item-quantity-value w-8 text-center text-sm font-medium text-text">{group.item.quantity}</span>
                                    <button
                                        className="cart-page__item-quantity-increase p-1 hover:bg-cream/50 transition-colors text-coral disabled:opacity-40 disabled:cursor-not-allowed"
                                        onClick={() => updateQuantity(group.item.id, group.item.quantity + 1, group.item.variant_id)}
                                        disabled={group.item.stock != null && group.item.stock > 0 && group.item.quantity >= group.item.stock}
                                    >
                                        <Plus className="h-3 w-3" />
                                    </button>
                                </div>
                                {group.item.stock != null && group.item.stock > 0 && group.item.quantity >= group.item.stock && (
                                    <span className="text-[11px] text-coral">Only {group.item.stock} in stock</span>
                                )}
                                <button
                                    onClick={() => removeFromCart(group.item.id, group.item.variant_id)}
                                    className="cart-page__item-remove text-text-muted hover:text-coral text-sm flex items-center"
                                >
                                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                                </button>
                            </div>
                        </div>
                        )
                    )}
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
                                <span className="cart-page__summary-value text-green-600">Calculated at checkout</span>
                            </div>
                            <div className="cart-page__summary-total border-t border-cream/30 pt-4 flex justify-between font-bold text-lg text-orange">
                                <span className="cart-page__summary-total-label">Total</span>
                                <span className="cart-page__summary-total-value">₹{cartTotal}</span>
                            </div>
                        </div>

                        <Link href="/checkout">
                            <Button
                                size="lg"
                                variant="primary"
                                className="cart-page__checkout-btn w-full flex items-center justify-center gap-2 h-12 mb-3"
                            >
                                <ShoppingBag className="h-5 w-5" /> Proceed to Checkout
                            </Button>
                        </Link>

                        <Button
                            size="lg"
                            variant="secondary"
                            className="cart-page__whatsapp-btn w-full flex items-center justify-center gap-2 h-12"
                            onClick={handleWhatsAppCheckout}
                        >
                            Order on WhatsApp <MessageCircle className="h-5 w-5" />
                        </Button>
                        <p className="cart-page__checkout-note text-xs text-text-muted text-center mt-4">
                            Checkout online or order directly via WhatsApp.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
