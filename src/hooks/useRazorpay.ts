"use client";

import { useEffect, useState, useCallback } from "react";

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

export function useRazorpay() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.Razorpay) {
      setIsLoaded(true);
      return;
    }

    const existing = document.querySelector(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => setIsLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => console.error("Failed to load Razorpay SDK");
    document.body.appendChild(script);
  }, []);

  const openCheckout = useCallback(
    (options: RazorpayOptions) => {
      if (!isLoaded || !window.Razorpay) {
        throw new Error("Razorpay SDK not loaded");
      }
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: unknown) => {
        console.error("Payment failed:", response);
      });
      rzp.open();
    },
    [isLoaded]
  );

  return { isLoaded, openCheckout };
}
