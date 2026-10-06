"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { evaluateCoupon } from "@/lib/services/coupons";
import { referralCodeFromSearch, saveAppliedCoupon } from "@/lib/referral";

/**
 * Turns `?ref=CODE` on any page into a remembered coupon. Runs once per
 * navigation, validates the code so a dead link does not promise a discount,
 * then quietly strips the parameter so the URL the shopper copies is clean.
 */
export function ReferralCapture() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const code = referralCodeFromSearch(window.location.search);
    if (!code) return;

    let cancelled = false;
    evaluateCoupon(code, 999999)
      .then((result) => {
        if (cancelled) return;
        if (result.valid || result.message?.startsWith("Add")) {
          // A min-order shortfall is still a real code; keep it for checkout.
          saveAppliedCoupon({ code, source: "link" });
          const who = result.owner_name ? ` via ${result.owner_name}` : "";
          const what =
            result.kind === "percent"
              ? `${Number(result.value)}% off`
              : result.kind === "flat"
              ? `₹${Number(result.value)} off`
              : "Your discount";
          toast.success(`${what} applied${who}. It will show at checkout.`, { duration: 5000 });
        }
      })
      .catch(() => {
        /* never block the page over a referral lookup */
      })
      .finally(() => {
        if (cancelled) return;
        const url = new URL(window.location.href);
        url.searchParams.delete("ref");
        url.searchParams.delete("coupon");
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
