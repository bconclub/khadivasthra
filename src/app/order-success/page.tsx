"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageCircle, ShoppingBag, Truck } from "lucide-react";
import { Suspense, useEffect } from "react";
import { trackPurchase } from "@/lib/fbq";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "";
  const isPaid = searchParams.get("paid") === "true";
  const totalParam = searchParams.get("total");

  // Fire Meta Pixel Purchase event once
  useEffect(() => {
    if (isPaid && orderNumber) {
      trackPurchase(orderNumber, totalParam ? parseFloat(totalParam) : 0);
    }
  }, [isPaid, orderNumber, totalParam]);

  const whatsappMessage = isPaid
    ? `Hi! I just paid for my order on Khadi Vasthra. My order number is: ${orderNumber}.`
    : `Hi! I just placed an order on Khadi Vasthra. My order number is: ${orderNumber}. Could you confirm the payment details?`;
  const whatsappUrl = `https://wa.me/918714090510?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-cream/30">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />

          <h1 className="text-3xl font-bold text-text font-serif mb-2">
            {isPaid ? "Payment Successful!" : "Order Placed!"}
          </h1>
          <p className="text-text-muted mb-6">
            {isPaid
              ? "Your payment has been confirmed. We'll start processing your order right away."
              : "Thank you for shopping with Khadi Vasthra."}
          </p>

          {orderNumber && (
            <div className="bg-cream/50 rounded-xl p-4 mb-6 border border-cream/30">
              <p className="text-sm text-text-muted mb-1">Order Number</p>
              <p className="text-2xl font-bold text-coral font-mono">{orderNumber}</p>
            </div>
          )}

          <p className="text-sm text-text-muted mb-8">
            {isPaid
              ? "You will receive order updates on your phone. For any queries, feel free to reach out on WhatsApp."
              : "We will reach out to you on WhatsApp to confirm payment and delivery details. You can also contact us directly."}
          </p>

          <div className="space-y-3">
            {orderNumber && (
              <Link href={`/track?order=${orderNumber}`} className="block">
                <Button
                  size="lg"
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2 h-12"
                >
                  <Truck className="h-5 w-5" /> Track Your Order
                </Button>
              </Link>
            )}

            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
              <Button
                size="lg"
                variant="secondary"
                className="w-full flex items-center justify-center gap-2 h-12"
              >
                <MessageCircle className="h-5 w-5" /> Chat on WhatsApp
              </Button>
            </a>

            <Link href="/shop" className="block">
              <Button
                size="lg"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 h-12"
              >
                <ShoppingBag className="h-5 w-5" /> Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-text-muted">Loading order details...</p>
        </div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
