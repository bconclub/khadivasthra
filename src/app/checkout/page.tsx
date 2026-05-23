"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useRazorpay } from "@/hooks/useRazorpay";
import { Button } from "@/components/ui/button";
import { createOrder, createRazorpayOrder, verifyRazorpayPayment, checkShippingServiceability } from "@/lib/services/orders";
import { getSettings } from "@/lib/services/settings";
import Link from "next/link";
import { ChevronLeft, Loader2, ShoppingBag, CheckCircle2, XCircle, Truck, CreditCard, Banknote } from "lucide-react";
import type { CheckoutFormData, Order, ServiceabilityResult, PaymentMethod } from "@/types";
import { trackInitiateCheckout } from "@/lib/fbq";

type PaymentStep = "form" | "creating" | "paying";

const PINCODE_DETAIL_FALLBACKS: Record<string, { city: string; state: string }> = {
  // Keep checkout usable when the public postal API is unavailable or misses a valid serviceable pincode.
  "560016": { city: "Bengaluru", state: "Karnataka" },
};

function formatRupees(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

async function fetchPincodeDetails(pincode: string): Promise<{ city: string; state: string } | null> {
  const fallback = PINCODE_DETAIL_FALLBACKS[pincode];
  if (fallback) return fallback;

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await res.json();
    if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
      const po = data[0].PostOffice[0];
      return { city: po.District, state: po.State };
    }
    return null;
  } catch {
    return null;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, cartTotal, clearCart } = useCart();
  const { isLoaded: razorpayLoaded, openCheckout } = useRazorpay();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("form");
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");

  // Address fields (split)
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Pincode lookup state
  const [fetchingPincode, setFetchingPincode] = useState(false);
  const [pincodeValid, setPincodeValid] = useState<boolean | null>(null);

  // Shipping serviceability state
  const [shippingInfo, setShippingInfo] = useState<ServiceabilityResult | null>(null);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [pincodeError, setPincodeError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pincodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [codEnabledGlobal, setCodEnabledGlobal] = useState(true);

  // Fetch COD setting
  useEffect(() => {
    getSettings().then((s) => {
      if (s) setCodEnabledGlobal(s.cod_enabled ?? true);
    });
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const isCod = paymentMethod === "cod";
  const shippingCost = shippingInfo?.available
    ? (isCod ? shippingInfo.cod_cheapest_rate : shippingInfo.cheapest_rate)
    : 0;
  const codCharges = isCod ? Math.round((cartTotal + shippingCost) * 0.016) : 0;
  const orderTotal = cartTotal + shippingCost + codCharges;

  // COD availability: pincode must support COD and cart total must be ≥ ₹1000
  const COD_MINIMUM = 1000;
  const codAvailable = codEnabledGlobal && (shippingInfo?.cod_available ?? false) && cartTotal >= COD_MINIMUM;
  const pincodeLookupFailed = pincodeValid === false && shippingInfo?.available;
  const cityStateReadOnly = pincodeValid === true || !shippingInfo?.available;

  // Fetch city/state from pincode API + check shipping serviceability
  useEffect(() => {
    if (pincodeDebounceRef.current) clearTimeout(pincodeDebounceRef.current);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    let cancelled = false;

    const trimmed = pincode.trim();
    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      setCity("");
      setState("");
      setPincodeValid(null);
      setShippingInfo(null);
      setPincodeError("");
      return;
    }

    // Fetch city/state from postal API
    setFetchingPincode(true);
    setPincodeValid(null);
    pincodeDebounceRef.current = setTimeout(async () => {
      const details = await fetchPincodeDetails(trimmed);
      if (cancelled) return;
      if (details) {
        setCity(details.city);
        setState(details.state);
        setPincodeValid(true);
      } else {
        setCity("");
        setState("");
        setPincodeValid(false);
      }
      setFetchingPincode(false);
    }, 300);

    // Check shipping serviceability
    setCheckingPincode(true);
    setPincodeError("");
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkShippingServiceability(trimmed, totalItems);
        if (cancelled) return;
        setShippingInfo(result);
        if (!result.available) {
          setPincodeError("Delivery not available to this pincode.");
        }
        if (!result.cod_available && paymentMethod === "cod") {
          setPaymentMethod("online");
        }
      } catch {
        if (cancelled) return;
        setPincodeError("Could not check delivery availability.");
        setShippingInfo(null);
      } finally {
        if (cancelled) return;
        setCheckingPincode(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      if (pincodeDebounceRef.current) clearTimeout(pincodeDebounceRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [pincode, totalItems, paymentMethod]);

  const buildFormData = (): CheckoutFormData => {
    const addressParts = [houseNo.trim(), street.trim()];
    if (landmark.trim()) addressParts.push(landmark.trim());
    return {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: addressParts.join(", "),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
    };
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
        name,
        email: email || undefined,
        contact: phone,
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
    const formData = buildFormData();
    trackInitiateCheckout(items.map((i) => ({ id: i.id, price: i.price, quantity: i.quantity })), orderTotal);

    try {
      const order = await createOrder(formData, items, cartTotal, shippingCost, "cod");

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

    if (!name || !phone || !houseNo || !street || !pincode || !city || !state) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    if (!/^\d{6}$/.test(pincode)) {
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
    const formData = buildFormData();
    trackInitiateCheckout(items.map((i) => ({ id: i.id, price: i.price, quantity: i.quantity })), orderTotal);

    try {
      const order = pendingOrder || await createOrder(formData, items, cartTotal, shippingCost, "online");
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

  const inputCls = "w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent";
  const readOnlyCls = "w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-text-muted cursor-not-allowed";

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
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputCls}
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
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className={inputCls}
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
                      House/Flat No. <span className="text-coral">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={houseNo}
                      onChange={(e) => setHouseNo(e.target.value)}
                      className={inputCls}
                      placeholder="House No., Flat No., Building Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Street/Area <span className="text-coral">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className={inputCls}
                      placeholder="Street, Locality, Area"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Landmark <span className="text-text-muted font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className={inputCls}
                      placeholder="Near temple, opposite mall, etc."
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
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className={inputCls}
                      placeholder="6-digit pincode"
                    />
                    {(fetchingPincode || checkingPincode) && (
                      <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Checking pincode...
                      </p>
                    )}
                    {!fetchingPincode && !checkingPincode && pincodeValid === false && !shippingInfo?.available && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Invalid pincode
                      </p>
                    )}
                    {!fetchingPincode && !checkingPincode && shippingInfo?.available && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Delivery available. Est. {shippingInfo.fastest_etd}
                      </p>
                    )}
                    {!fetchingPincode && !checkingPincode && pincodeError && pincodeValid !== false && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> {pincodeError}
                      </p>
                    )}
                    {!fetchingPincode && !checkingPincode && pincodeLookupFailed && (
                      <p className="text-xs text-text-muted mt-1">
                        City and state could not be auto-filled. Please enter them below.
                      </p>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">
                        City <span className="text-coral">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        readOnly={cityStateReadOnly}
                        className={cityStateReadOnly ? readOnlyCls : inputCls}
                        placeholder={cityStateReadOnly ? "Auto-filled from pincode" : "Enter city"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">
                        State <span className="text-coral">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        readOnly={cityStateReadOnly}
                        className={cityStateReadOnly ? readOnlyCls : inputCls}
                        placeholder={cityStateReadOnly ? "Auto-filled from pincode" : "Enter state"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Email <span className="text-text-muted font-normal">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputCls}
                      placeholder="your@email.com"
                    />
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
                    {codEnabledGlobal && (
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
                          {codAvailable ? "Pay when delivered" : cartTotal < COD_MINIMUM ? `Min. order ${formatRupees(COD_MINIMUM)}` : "Not available"}
                        </p>
                      </div>
                    </button>
                    )}
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
                    <div key={`${item.id}${item.variant_id ? `-${item.variant_id}` : ''}`} className="flex justify-between text-sm">
                      <span className="text-text-muted line-clamp-1 flex-1 mr-2">
                        {item.name} 
                        {(item.color_name || item.size) && (
                          <span className="text-xs text-text-muted block">
                            {item.color_name && `Color: ${item.color_name}`}
                            {item.color_name && item.size && " / "}
                            {item.size && `Size: ${item.size}`}
                          </span>
                        )}
                        x {item.quantity}
                      </span>
                      <span className="font-medium text-text whitespace-nowrap">
                        {formatRupees(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-cream/30 pt-4 space-y-2 mb-6">
                  <div className="flex justify-between text-sm text-text-muted">
                    <span>Subtotal</span>
                    <span>{formatRupees(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-text-muted">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> Shipping
                    </span>
                    {checkingPincode ? (
                      <span className="text-text-muted">Calculating...</span>
                    ) : shippingInfo?.available ? (
                      <span>{shippingCost > 0 ? formatRupees(shippingCost) : "Free"}</span>
                    ) : (
                      <span className="text-text-muted">Enter pincode</span>
                    )}
                  </div>
                  {isCod && shippingInfo?.available && (
                    <div className="flex justify-between text-sm text-text-muted">
                      <span className="flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5" /> COD Charges (1.6%)
                      </span>
                      <span>{formatRupees(codCharges)}</span>
                    </div>
                  )}
                  {shippingInfo?.available && shippingInfo.fastest_etd && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Est. delivery: {shippingInfo.fastest_etd}
                    </p>
                  )}
                  <div className="flex justify-between font-bold text-lg text-orange border-t border-cream/30 pt-3">
                    <span>Total</span>
                    <span>{formatRupees(orderTotal)}</span>
                  </div>
                  {isCod && (
                    <p className="text-xs text-text-muted flex items-center gap-1">
                      <Banknote className="w-3 h-3" /> Pay {formatRupees(orderTotal)} at delivery
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
