"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { createOrder } from "@/lib/services/orders";
import Link from "next/link";
import { ChevronLeft, Loader2, ShoppingBag } from "lucide-react";
import type { CheckoutFormData } from "@/types";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, cartTotal, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CheckoutFormData>({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "Kerala",
    pincode: "",
    notes: "",
  });

  const updateField = (field: keyof CheckoutFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!form.name || !form.phone || !form.address || !form.city || !form.pincode) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder(form, items, cartTotal);
      clearCart();
      router.push(`/order-success?order=${order.order_number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order. Please try again.");
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-coral/30 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text mb-2">Your Cart is Empty</h1>
          <p className="text-text-muted mb-6">Add some products to checkout.</p>
          <Link href="/shop">
            <Button variant="primary">Browse Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 max-w-5xl py-8">
        <Link href="/cart" className="inline-flex items-center gap-2 text-coral hover:underline mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Cart
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-text font-serif mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form Fields */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Info */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-cream/30">
                <h2 className="text-lg font-bold text-text mb-4">Contact Information</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Full Name <span className="text-coral">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Phone Number <span className="text-coral">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text mb-1">
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-cream/30">
                <h2 className="text-lg font-bold text-text mb-4">Shipping Address</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Address <span className="text-coral">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
                      placeholder="House/Flat No., Street, Area"
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">
                        City <span className="text-coral">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={form.state}
                        onChange={(e) => updateField("state", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">
                        Pincode <span className="text-coral">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.pincode}
                        onChange={(e) => updateField("pincode", e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
                        placeholder="6-digit pincode"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Order Notes (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
                      placeholder="Any special instructions..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-cream/30 sticky top-24">
                <h2 className="text-lg font-bold text-text mb-4">Order Summary</h2>

                <div className="space-y-3 mb-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-text-muted line-clamp-1 flex-1 mr-2">
                        {item.name} x {item.quantity}
                      </span>
                      <span className="font-medium text-text whitespace-nowrap">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-cream/30 pt-4 space-y-2 mb-6">
                  <div className="flex justify-between text-sm text-text-muted">
                    <span>Subtotal</span>
                    <span>₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between text-sm text-text-muted">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-orange border-t border-cream/30 pt-3">
                    <span>Total</span>
                    <span>₹{cartTotal}</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  variant="primary"
                  className="w-full h-14 text-lg font-semibold"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Placing Order...
                    </>
                  ) : (
                    "Place Order"
                  )}
                </Button>

                <p className="text-xs text-text-muted text-center mt-3">
                  We will contact you on WhatsApp to confirm payment and delivery.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
