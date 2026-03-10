"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useRazorpay } from "@/hooks/useRazorpay";
import { Button } from "@/components/ui/button";
import { createOrder, createRazorpayOrder, verifyRazorpayPayment, createShiprocketOrder, checkShippingServiceability } from "@/lib/services/orders";
import Link from "next/link";
import { ChevronLeft, Loader2, ShoppingBag, CheckCircle2, XCircle, Truck, CreditCard, Banknote } from "lucide-react";
import type { CheckoutFormData, Order, ServiceabilityResult, PaymentMethod } from "@/types";
import { trackInitiateCheckout } from "@/lib/fbq";

type PaymentStep = "form" | "creating" | "paying";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, cartTotal, clearCart } = useCart();
  const { isLoaded: razorpayLoaded, openCheckout } = useRazorpay();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("form");
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");
  const [form, setForm] = useState<CheckoutFormData>({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "Kerala",
    pincode: "",
  });

  // Shipping serviceability state
  const [shippingInfo, setShippingInfo] = useState<ServiceabilityResult | null>(null);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [pincodeError, setPincodeError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const isCod = paymentMethod === "cod";
  const shippingCost = shippingInfo?.available
    ? (isCod ? shippingInfo.cod_cheapest_rate : shippingInfo.cheapest_rate)
    : 0;
  const orderTotal = cartTotal + shippingCost;

  // COD availability: pincode must support COD and cart total must be ≥ ₹1000
  const COD_MINIMUM = 1000;
  const codAvailable = (shippingInfo?.cod_available ?? false) && cartTotal >= COD_MINIMUM;

  // Check pincode serviceability with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const pincode = form.pincode.trim();
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setShippingInfo(null);
      setPincodeError("");
      return;
    }

    setCheckingPincode(true);
    setPincodeError("");

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkShippingServiceability(pincode, totalItems);
        setShippingInfo(result);
        if (!result.available) {
          setPincodeError("Delivery not available to this pincode.");
        }
        // If COD was selected but not available for new pincode, switch to online
        if (!result.cod_available && paymentMethod === "cod") {
          setPaymentMethod("online");
        }
      } catch {
        setPincodeError("Could not check delivery availability.");
        setShippingInfo(null);
      } finally {
        setCheckingPincode(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form.pincode, totalItems]);

  const updateField = (field: keyof CheckoutFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const initiatePayment = async (order: Order) => {
    const razorpayOrder = await createRazorpayOrder(order.id, order.total);

    setPaymentStep("paying");
    openCheckout({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: "Khadi Vasthra",
      description: `Order ${order.order_number}`,
      order_id: razorpayOrder.razorpay_order_id,
      prefill: {
        name: form.name,
        email: form.email || undefined,
        contact: form.phone,
      },
      theme: { color: "#E8657B" },
      handler: async (response: RazorpayResponse) => {
        try {
          const result = await verifyRazorpayPayment(
            order.id,
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );
          if (result.verified) {
            try {
              await createShiprocketOrder(order.id);
            } catch {
              console.warn("Shiprocket auto-create fallback failed for order:", order.id);
            }
            clearCart();
            router.push(`/order-success?order=${order.order_number}&paid=true&total=${order.total}`);
          } else {
            setError("Payment verification failed. Please contact support.");
            setPaymentStep("form");
            setSubmitting(false);
          }
        } catch {
          setError(
            "Payment verification failed. Your payment may have been processed. Please contact support with your order number."
          );
          setPaymentStep("form");
          setSubmitting(false);
        }
      },
      modal: {
        ondismiss: () => {
          setPaymentStep("form");
          setSubmitting(false);
          setError("Payment was not completed. You can retry below.");
        },
        confirm_close: true,
        escape: false,
      },
    });
  };

  const handleCodOrder = async () => {
    setSubmitting(true);
    setPaymentStep("creating");
    trackInitiateCheckout(items.map((i) => ({ id: i.id, price: i.price, quantity: i.quantity })), orderTotal);

    try {
      const order = await createOrder(form, items, cartTotal, shippingCost, "cod");

      // Create Shiprocket shipment directly (COD order is already confirmed)
      try {
        await createShiprocketOrder(order.id);
      } catch {
        console.warn("Shiprocket auto-create failed for COD order:", order.id);
      }

      clearCart();
      router.push(`/order-success?order=${order.order_number}&paid=false&total=${order.total}`);
    } catch (err) {
      console.error("COD order error:", err);
      setError(err instanceof Error ? err.message : "Failed to place order. Please try again.");
      setPaymentStep("form");
      setSubmitting(false);
    }
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

    if (!/^\d{10}$/.test(form.phone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    if (!/^\d{6}$/.test(form.pincode)) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }

    if (!shippingInfo?.available) {
      setError("Please enter a valid pincode where delivery is available.");
      return;
    }

    // COD flow
    if (isCod) {
      if (!codAvailable) {
        setError("Cash on Delivery is not available for this pincode. Please choose online payment.");
        return;
      }
      await handleCodOrder();
      return;
    }

    // Online payment flow
    if (!razorpayLoaded) {
      setError("Payment system is loading. Please wait a moment and try again.");
      return;
    }

    setSubmitting(true);
    setPaymentStep("creating");
    trackInitiateCheckout(items.map((i) => ({ id: i.id, price: i.price, quantity: i.quantity })), orderTotal);

    try {
      const order = pendingOrder || await createOrder(form, items, cartTotal, shippingCost, "online");
      if (!pendingOrder) setPendingOrder(order);

      await initiatePayment(order);
    } catch (err) {
      console.error("Checkout error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to initiate payment. Please try again."
      );
      setPaymentStep("form");
      setSubmitting(false);
    }
  };

  const handleRetryPayment = async () => {
    if (!pendingOrder) return;
    setError("");
    setSubmitting(true);
    setPaymentStep("creating");
    try {
      await initiatePayment(pendingOrder);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initiate payment. Please try again."
      );
      setPaymentStep("form");
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !pendingOrder) {
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

  const buttonText = isCod
    ? paymentStep === "creating" ? "Placing Order..." : "Place Order (COD)"
    : paymentStep === "creating"
      ? "Creating Order..."
      : paymentStep === "paying"
        ? "Complete Payment..."
        : "Place Order & Pay";

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
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
                      placeholder="10-digit phone number"
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
                  <div>
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
                  <div className="grid md:grid-cols-2 gap-4">
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
                        Pincode <span className="text-coral">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        maxLength={6}
                        value={form.pincode}
                        onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
                        placeholder="6-digit pincode"
                      />
                      {checkingPincode && (
                        <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Checking delivery availability...
                        </p>
                      )}
                      {!checkingPincode && shippingInfo?.available && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Delivery available. Est. {shippingInfo.fastest_etd}
                        </p>
                      )}
                      {!checkingPincode && pincodeError && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> {pincodeError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              {shippingInfo?.available && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-cream/30">
                  <h2 className="text-lg font-bold text-text mb-4">Payment Method</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("online")}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        paymentMethod === "online"
                          ? "border-coral bg-coral/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <CreditCard className={`w-5 h-5 ${paymentMethod === "online" ? "text-coral" : "text-gray-400"}`} />
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${paymentMethod === "online" ? "text-coral" : "text-text"}`}>
                          Pay Online
                        </p>
                        <p className="text-xs text-text-muted">UPI, Card, Net Banking</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => codAvailable && setPaymentMethod("cod")}
                      disabled={!codAvailable}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        !codAvailable
                          ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                          : paymentMethod === "cod"
                            ? "border-coral bg-coral/5"
                            : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Banknote className={`w-5 h-5 ${paymentMethod === "cod" ? "text-coral" : "text-gray-400"}`} />
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${paymentMethod === "cod" ? "text-coral" : "text-text"}`}>
                          Cash on Delivery
                        </p>
                        <p className="text-xs text-text-muted">
                          {codAvailable ? "Pay when delivered" : cartTotal < COD_MINIMUM ? `Min. order ₹${COD_MINIMUM}` : "Not available"}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
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
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> Shipping
                    </span>
                    {checkingPincode ? (
                      <span className="text-text-muted">Calculating...</span>
                    ) : shippingInfo?.available ? (
                      <span>₹{shippingCost}</span>
                    ) : (
                      <span className="text-text-muted">Enter pincode</span>
                    )}
                  </div>
                  {shippingInfo?.available && shippingInfo.fastest_etd && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Est. delivery: {shippingInfo.fastest_etd}
                    </p>
                  )}
                  <div className="flex justify-between font-bold text-lg text-orange border-t border-cream/30 pt-3">
                    <span>Total</span>
                    <span>₹{orderTotal}</span>
                  </div>
                  {isCod && (
                    <p className="text-xs text-text-muted flex items-center gap-1">
                      <Banknote className="w-3 h-3" /> Pay ₹{orderTotal} at delivery
                    </p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                {pendingOrder && paymentStep === "form" && !isCod ? (
                  <Button
                    type="button"
                    size="lg"
                    variant="primary"
                    className="w-full h-14 text-lg font-semibold"
                    disabled={submitting}
                    onClick={handleRetryPayment}
                  >
                    Retry Payment
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    className="w-full h-14 text-lg font-semibold"
                    disabled={submitting || (!isCod && !razorpayLoaded) || (!shippingInfo?.available && !pendingOrder)}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> {buttonText}
                      </>
                    ) : !isCod && !razorpayLoaded ? (
                      "Loading payment..."
                    ) : (
                      buttonText
                    )}
                  </Button>
                )}

                <p className="text-xs text-text-muted text-center mt-3">
                  {isCod ? "Pay cash when your order is delivered." : "Secure payment powered by Razorpay."}{" "}
                  Having trouble?{" "}
                  <a
                    href="https://wa.me/918714090510"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-coral hover:underline"
                  >
                    Contact us on WhatsApp
                  </a>
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
