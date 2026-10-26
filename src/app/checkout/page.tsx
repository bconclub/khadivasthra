"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useRazorpay } from "@/hooks/useRazorpay";
import { Button } from "@/components/ui/button";
import { createOrder, createRazorpayOrder, verifyRazorpayPayment, initiateEasebuzzPayment, checkShippingServiceability } from "@/lib/services/orders";
import { getSettings } from "@/lib/services/settings";
import { supabase } from "@/lib/supabase";
import { evaluateCoupon } from "@/lib/services/coupons";
import { clearAppliedCoupon, normaliseCode, readAppliedCoupon, saveAppliedCoupon } from "@/lib/referral";
import { CheckoutMusic } from "@/components/CheckoutMusic";
import Link from "next/link";
import { ChevronLeft, Loader2, ShoppingBag, CheckCircle2, XCircle, Truck, CreditCard, Banknote, BadgePercent, X } from "lucide-react";
import type { CartItem, CheckoutFormData, Order, ServiceabilityResult, PaymentMethod, PaymentGateway, ShippingTier, AppliedCoupon, CouponEvaluation } from "@/types";
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

  // Coupon / referral. `applied` is the code the shopper is carrying (typed, or
  // remembered from a ?ref= link); `evaluation` is what the database says it
  // is worth right now against this cart.
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [evaluation, setEvaluation] = useState<CouponEvaluation | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => {
    const stored = readAppliedCoupon();
    if (stored) setApplied(stored);
  }, []);

  useEffect(() => {
    if (!applied) {
      setEvaluation(null);
      return;
    }
    let cancelled = false;
    evaluateCoupon(applied.code, cartTotal)
      .then((r) => { if (!cancelled) setEvaluation(r); })
      .catch(() => { if (!cancelled) setEvaluation(null); });
    return () => { cancelled = true; };
  }, [applied, cartTotal]);

  const applyCoupon = async () => {
    const code = normaliseCode(couponInput);
    if (!code) return;
    setCouponBusy(true);
    try {
      const r = await evaluateCoupon(code, cartTotal);
      setEvaluation(r);
      if (r.valid || r.message?.startsWith("Add")) {
        const next: AppliedCoupon = { code, source: "code" };
        setApplied(next);
        saveAppliedCoupon(next);
        setCouponInput("");
      } else {
        setApplied(null);
      }
    } catch {
      setEvaluation({ valid: false, code, owner_name: null, kind: null, value: null, discount: 0, message: "Could not check that code. Try again." });
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = () => {
    setApplied(null);
    setEvaluation(null);
    clearAppliedCoupon();
  };

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
  const [shippingTiers, setShippingTiers] = useState<ShippingTier[] | null>(null);
  const [gateway, setGateway] = useState<PaymentGateway>("razorpay");

  // Fetch COD setting + shipping tiers + which gateway takes online payments
  useEffect(() => {
    getSettings().then((s) => {
      if (s) {
        setCodEnabledGlobal(s.cod_enabled ?? true);
        setShippingTiers(s.shipping_tiers || null);
        setGateway(s.payment_gateway === "easebuzz" ? "easebuzz" : "razorpay");
      }
    });
  }, []);

  // Easebuzz sends a failed or cancelled payment back here.
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("payment");
    if (result === "failed") setError("Payment was not completed. You can try again below.");
    else if (result === "error") setError("We could not confirm your payment. If money was debited, please contact support with your order number.");
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const isCod = paymentMethod === "cod";
  // Easebuzz will not start a payment without an email address.
  const emailRequired = !isCod && gateway === "easebuzz";
  // Customer pays a flat tier rate by item count (brand absorbs the
  // difference vs the real courier bill). The Shiprocket quote is only used
  // for availability/ETA/COD — and as a fallback if tiers aren't configured.
  const tierRate = (() => {
    if (!shippingTiers || shippingTiers.length === 0) return null;
    const sorted = [...shippingTiers].sort((a, b) => a.max_items - b.max_items);
    const tier = sorted.find((t) => totalItems <= t.max_items) || sorted[sorted.length - 1];
    return tier.rate;
  })();
  const shippingCost = shippingInfo?.available
    ? (tierRate ?? (isCod ? shippingInfo.cod_cheapest_rate : shippingInfo.cheapest_rate))
    : 0;
  const discount = evaluation?.valid ? Number(evaluation.discount) : 0;
  const discountedSubtotal = Math.max(0, cartTotal - discount);
  const codCharges = isCod ? Math.round((discountedSubtotal + shippingCost) * 0.016) : 0;
  const orderTotal = discountedSubtotal + shippingCost + codCharges;
  const activeCoupon: AppliedCoupon | null = evaluation?.valid && applied ? applied : null;

  // MRP (compare_price) for the summary table. The cart only stores the
  // selling price, so look it up; combo lines carry a combo price and have no MRP.
  const [mrpById, setMrpById] = useState<Record<string, number>>({});
  useEffect(() => {
    const ids = [...new Set(items.filter((i) => !i.combo).map((i) => i.id))];
    if (ids.length === 0) return;
    let cancelled = false;
    supabase.from("products").select("id, compare_price").in("id", ids).then(({ data }) => {
      if (cancelled) return;
      const next: Record<string, number> = {};
      (data || []).forEach((p) => { if (p.compare_price) next[p.id] = Number(p.compare_price); });
      setMrpById(next);
    });
    return () => { cancelled = true; };
  }, [items]);
  const mrpOf = (item: CartItem) => {
    const mrp = item.combo ? 0 : mrpById[item.id] ?? 0;
    return mrp > item.price ? mrp : item.price;
  };
  const mrpTotal = items.reduce((sum, i) => sum + mrpOf(i) * i.quantity, 0);
  const productSavings = Math.max(0, mrpTotal - cartTotal);
  const totalSavings = productSavings + discount;
  const savingsPercent = mrpTotal > 0 ? Math.round((totalSavings / mrpTotal) * 100) : 0;

  // COD availability: pincode must support COD and cart total must be ≥ ₹1000
  const COD_MINIMUM = 1000;
  const codAvailable = codEnabledGlobal && (shippingInfo?.cod_available ?? false) && cartTotal >= COD_MINIMUM;
  const pincodeLookupFailed = pincodeValid === false && shippingInfo?.available;
  const cityStateReadOnly = pincodeValid === true || !shippingInfo?.available;

  // If COD is selected but the cart drops below the minimum (or COD becomes
  // unavailable), fall back to online so the ₹1000 rule can't be bypassed.
  useEffect(() => {
    if (paymentMethod === "cod" && !codAvailable) {
      setPaymentMethod("online");
    }
  }, [paymentMethod, codAvailable]);

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
    if (gateway === "easebuzz") {
      // Hosted checkout: Easebuzz takes over the page and posts the result to
      // the easebuzz-callback function, which sends the shopper on to
      // /order-success (cart is cleared there) or back here on failure.
      const { checkout_url } = await initiateEasebuzzPayment(order.id);
      setPaymentStep("paying");
      window.location.assign(checkout_url);
      return;
    }

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
      const order = await createOrder(formData, items, cartTotal, shippingCost, "cod", activeCoupon);

      clearCart();
      clearAppliedCoupon();
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
    if (emailRequired && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address for online payment.");
      return;
    }

    if (gateway === "razorpay" && !razorpayLoaded) {
      setError("Payment system is loading. Please wait a moment and try again.");
      return;
    }

    setSubmitting(true);
    setPaymentStep("creating");
    const formData = buildFormData();
    trackInitiateCheckout(items.map((i) => ({ id: i.id, price: i.price, quantity: i.quantity })), orderTotal);

    try {
      const order = pendingOrder || await createOrder(formData, items, cartTotal, shippingCost, "online", activeCoupon);
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

        <div className="flex items-center justify-between gap-3 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text font-serif">Checkout</h1>
          <CheckoutMusic />
        </div>

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
                      Email{" "}
                      <span className="text-text-muted font-normal">
                        {emailRequired ? "(required for online payment)" : "(optional)"}
                      </span>
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

                <div className="divide-y divide-cream/40 border-y border-cream/40 mb-4">
                  {items.map((item) => {
                    const mrp = mrpOf(item);
                    const off = mrp > item.price ? Math.round((1 - item.price / mrp) * 100) : 0;
                    return (
                      <div key={`${item.id}${item.variant_id ? `-${item.variant_id}` : ''}`} className="flex gap-3 py-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-cream/50 flex-shrink-0 flex items-center justify-center">
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag className="w-6 h-6 text-coral/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-sm">
                          <p className="font-semibold text-text line-clamp-2">{item.name}</p>
                          {(item.color_name || item.size) && (
                            <p className="text-xs text-text-muted">
                              {item.color_name && `Color: ${item.color_name}`}
                              {item.color_name && item.size && " / "}
                              {item.size && `Size: ${item.size}`}
                            </p>
                          )}
                          <p className="text-text-muted">Quantity: {item.quantity}</p>
                          {off > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-text-muted">MRP: <span className="line-through">{formatRupees(mrp)}</span></span>
                              <span className="text-[11px] font-semibold text-green-700 bg-green-50 rounded-full px-2 py-0.5">{off}% OFF</span>
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-text whitespace-nowrap text-sm">
                          {formatRupees(item.price * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Coupon / referral */}
                <div className="border-t border-cream/30 pt-4 mb-4">
                  {activeCoupon && evaluation ? (
                    <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5">
                      <BadgePercent className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 text-sm">
                        <p className="font-medium text-green-800">
                          {evaluation.kind === "percent" ? `${Number(evaluation.value)}% off` : `${formatRupees(Number(evaluation.value))} off`}
                          {evaluation.owner_name ? ` via ${evaluation.owner_name}` : ""}
                        </p>
                        <p className="text-xs text-green-700">
                          Code <span className="font-mono">{evaluation.code}</span>
                          {applied?.source === "link" ? " from your referral link" : ""}
                        </p>
                      </div>
                      <button type="button" onClick={removeCoupon} className="text-green-700/60 hover:text-red-500" aria-label="Remove coupon">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }}
                          placeholder="Coupon or influencer code"
                          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-cream/60 text-sm font-mono uppercase focus:ring-2 focus:ring-coral focus:border-transparent"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={applyCoupon} disabled={couponBusy || !couponInput.trim()}>
                          {couponBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                      {evaluation && !evaluation.valid && evaluation.message && (
                        <p className="text-xs text-red-600 mt-1.5">{evaluation.message}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-cream/30 pt-4 space-y-2.5 mb-6 text-sm">
                  <div className="flex justify-between text-text-muted">
                    <span>Product price</span>
                    <span>{formatRupees(mrpTotal)}</span>
                  </div>
                  {productSavings > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Discount ({Math.round((productSavings / mrpTotal) * 100)}%)</span>
                      <span>&minus;{formatRupees(productSavings)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span className="flex items-center gap-1">
                        <BadgePercent className="w-3.5 h-3.5" /> Coupon{evaluation?.code ? ` (${evaluation.code})` : ""}
                      </span>
                      <span>&minus;{formatRupees(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-text-muted">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> Courier charges
                    </span>
                    {checkingPincode ? (
                      <span>Calculating...</span>
                    ) : shippingInfo?.available ? (
                      <span className="text-text">{shippingCost > 0 ? formatRupees(shippingCost) : "Free"}</span>
                    ) : (
                      <span className="text-text">Extra</span>
                    )}
                  </div>
                  {isCod && shippingInfo?.available && (
                    <div className="flex justify-between text-text-muted">
                      <span className="flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5" /> COD charges (1.6%)
                      </span>
                      <span>{formatRupees(codCharges)}</span>
                    </div>
                  )}
                  {shippingInfo?.available && shippingInfo.fastest_etd && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Est. delivery: {shippingInfo.fastest_etd}
                    </p>
                  )}
                  <div className="flex justify-between items-baseline border-t border-cream/30 pt-3">
                    <span className="font-bold text-base text-text">{shippingInfo?.available ? "Total" : "Product total"}</span>
                    <span className="font-bold text-xl text-green-700">{formatRupees(orderTotal)}</span>
                  </div>
                  {totalSavings > 0 && (
                    <p className="text-xs font-medium text-green-700">
                      You save {formatRupees(totalSavings)} ({savingsPercent}%) on this order
                    </p>
                  )}
                  {!shippingInfo?.available && (
                    <p className="text-xs text-text-muted">
                      Courier charges are added once you enter your delivery pincode.
                    </p>
                  )}
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
                    disabled={submitting || (!isCod && gateway === "razorpay" && !razorpayLoaded) || (!shippingInfo?.available && !pendingOrder)}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> {buttonText}
                      </>
                    ) : !isCod && gateway === "razorpay" && !razorpayLoaded ? (
                      "Loading payment..."
                    ) : (
                      buttonText
                    )}
                  </Button>
                )}

                <p className="text-xs text-text-muted text-center mt-3">
                  {isCod ? "Pay cash when your order is delivered." : `Secure payment powered by ${gateway === "easebuzz" ? "Easebuzz" : "Razorpay"}.`}{" "}
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
