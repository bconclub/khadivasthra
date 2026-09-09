"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getWholesaleProducts, submitEnquiry, wholesaleEnabled } from "@/lib/services/wholesale";
import {
  addLine,
  clearEnquiryCart,
  enquiryTotals,
  readEnquiryCart,
  removeLine,
  setLineQty,
  writeEnquiryCart,
} from "@/lib/wholesale-cart";
import { storageImage, IMG } from "@/lib/image";
import { Button } from "@/components/ui/button";
import type { WholesaleCartItem } from "@/types";
import type { WholesaleProduct } from "@/lib/services/wholesale";
import { Loader2, Minus, Plus, Trash2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

const money = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

export default function WholesalePage() {
  const { data: enabled, loading: loadingFlag } = useSupabaseQuery(wholesaleEnabled);

  if (loadingFlag) return <FullPageSpinner />;

  // The master switch is checked live, so switching the channel off takes effect
  // without waiting for a rebuild.
  if (enabled !== true) {
    return (
      <Shell>
        <Notice
          title="Wholesale is not open yet"
          body="Our trade channel is currently closed. Please check back soon."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <Catalogue />
    </Shell>
  );
}

function Catalogue() {
  const { data: products, loading, error, refetch } = useSupabaseQuery(getWholesaleProducts);
  const [cart, setCart] = useState<WholesaleCartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "", business: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    setCart(readEnquiryCart());
  }, []);

  const update = (next: WholesaleCartItem[]) => {
    setCart(next);
    writeEnquiryCart(next);
  };

  const add = (row: WholesaleProduct) => {
    update(
      addLine(cart, {
        product_id: row.product.id,
        name: row.product.name,
        slug: row.product.slug,
        image: row.product.image_url || "",
        wholesale_price: row.price,
        min_qty: row.min_qty,
      })
    );
    toast.success(`${row.product.name} added - ${row.min_qty} pieces minimum`);
  };

  const send = async () => {
    if (!contact.name.trim() || contact.phone.replace(/\D/g, "").length < 7) {
      toast.error("Enter your name and a valid phone number.");
      return;
    }
    setSending(true);
    try {
      const enquiry = await submitEnquiry(
        cart.map((i) => ({
          product_id: i.product_id,
          product_name: i.name,
          product_image: i.image || null,
          wholesale_price: i.wholesale_price,
          quantity: i.quantity,
          subtotal: i.quantity * i.wholesale_price,
          min_qty: i.min_qty,
        })),
        notes || null,
        contact
      );
      clearEnquiryCart();
      setCart([]);
      setNotes("");
      setSent(enquiry.enquiry_number || "your enquiry");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the enquiry");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <FullPageSpinner />;

  const list = products || [];
  const { pieces, total } = enquiryTotals(cart);

  return (
    <div className="container mx-auto px-4 max-w-7xl py-8">
      <div className="mb-8">
        <span className="inline-block px-3 py-1 rounded-full bg-coral/10 text-coral text-xs font-semibold uppercase tracking-wider mb-3">
          Wholesale collection
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-text font-serif">Wholesale catalogue</h1>
        <p className="text-text-muted mt-2">
          Explore bulk prices and minimum quantities. Build your list for a wholesale quote.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Wholesale products could not load. {error}
          <button onClick={refetch} className="ml-3 underline font-semibold">Try again</button>
        </div>
      )}

      {sent && (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">Enquiry {sent} sent</p>
            <p className="text-sm text-green-700">
              Our team will be in touch with a quote. You can start another list below.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
          {list.length === 0 && !error ? (
            <div className="text-center py-16 bg-white rounded-xl">
              <p className="text-text-muted">No products are open for wholesale yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
              {list.map((row) => (
                <TradeCard key={row.product.id} row={row} onAdd={() => add(row)} />
              ))}
            </div>
          )}
        </div>

        {/* Enquiry basket */}
        <div className="lg:sticky lg:top-24 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-text text-lg mb-4">Your enquiry</h2>

          {cart.length === 0 ? (
            <p className="text-sm text-text-muted">
              Nothing added yet. Pick the pieces you want and set the quantities.
            </p>
          ) : (
            <>
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.product_id} className="flex gap-3">
                    <div className="relative w-14 h-16 rounded-lg overflow-hidden bg-cream/50 flex-shrink-0">
                      {item.image && (
                        <Image
                          src={storageImage(item.image, IMG.thumb)}
                          alt={item.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{item.name}</p>
                      <p className="text-xs text-text-muted mb-1.5">
                        {money(item.wholesale_price)} · min {item.min_qty}
                      </p>
                      <div className="flex items-center gap-2">
                        <QtyStepper
                          value={item.quantity}
                          min={item.min_qty}
                          onChange={(q) => update(setLineQty(cart, item.product_id, q))}
                        />
                        <button
                          onClick={() => update(removeLine(cart, item.product_id))}
                          className="text-gray-300 hover:text-red-500 ml-auto"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 mt-5 pt-4 space-y-1 text-sm">
                <div className="flex justify-between text-text-muted">
                  <span>Pieces</span>
                  <span>{pieces}</span>
                </div>
                <div className="flex justify-between font-semibold text-text text-base">
                  <span>Estimated value</span>
                  <span>{money(total)}</span>
                </div>
                <p className="text-xs text-text-muted pt-1">
                  Indicative only. Freight and taxes are confirmed on the quote.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-text">Contact details</p>
                <p className="text-xs text-text-muted">No account needed. We will contact you with a quote.</p>
                {(["name", "phone", "business"] as const).map((field) => (
                  <label key={field} className="block text-sm text-text">
                    {field === "name" ? "Your name" : field === "phone" ? "Phone number" : "Business name (optional)"}
                    <input type={field === "phone" ? "tel" : "text"} value={contact[field]}
                      required={field !== "business"} maxLength={field === "phone" ? 30 : 120}
                      autoComplete={field === "phone" ? "tel" : field === "name" ? "name" : "organization"}
                      onChange={(e) => setContact({ ...contact, [field]: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
                  </label>
                ))}
              </div>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything we should know? Delivery timelines, packing, custom sizes..."
                className="w-full mt-4 px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-coral focus:border-transparent"
              />

              <Button
                variant="primary"
                size="lg"
                className="w-full mt-3"
                onClick={send}
                disabled={sending}
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</>
                ) : (
                  "Send enquiry"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TradeCard({ row, onAdd }: { row: WholesaleProduct; onAdd: () => void }) {
  const { product, price, min_qty: min } = row;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
      <div className="relative aspect-[3/4] bg-cream/50">
        {product.image_url && (
          <Image
            src={storageImage(product.image_url, IMG.card)}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
            unoptimized
          />
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="text-xs text-text-muted">{product.category?.name}</p>
        <h3 className="text-sm font-semibold text-text leading-snug line-clamp-2">{product.name}</h3>
        <div className="mt-2 mb-3">
          <span className="text-base font-bold text-text">{money(price)}</span>
          <span className="text-xs text-text-muted"> / piece</span>
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-amber-800">Minimum order</p>
            <p className="text-sm font-bold text-amber-950">{min} pieces</p>
            <p className="text-xs text-amber-800 mt-0.5">From {money(price * min)} per lot</p>
          </div>
        </div>
        <Button variant="primary" size="sm" className="w-full mt-auto" onClick={onAdd}>
          Add to enquiry
        </Button>
      </div>
    </div>
  );
}

function QtyStepper({
  value,
  min,
  onChange,
}: {
  value: number;
  min: number;
  onChange: (q: number) => void;
}) {
  return (
    <div className="inline-flex items-center border border-gray-200 rounded-lg">
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        className="px-2 py-1 text-gray-500 disabled:opacity-30"
        aria-label="Decrease quantity"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || min)}
        className="w-14 text-center text-sm py-1 outline-none"
      />
      <button
        onClick={() => onChange(value + 1)}
        className="px-2 py-1 text-gray-500"
        aria-label="Increase quantity"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-coral border-b border-white/10">
        <div className="container mx-auto px-4 max-w-7xl h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-lanuages_hero/Artboard 1.webp"
              alt="Khadi Vasthra"
              width={1080}
              height={519}
              className="h-11 w-auto object-contain"
              priority
            />
          </Link>

        </div>
      </header>
      {children}
    </div>
  );
}

function Notice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-4 max-w-lg py-20 text-center">
      <h1 className="text-2xl md:text-3xl font-bold text-text font-serif mb-3">{title}</h1>
      <p className="text-text-muted leading-relaxed mb-7">{body}</p>
      {action}
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-coral" />
    </div>
  );
}
