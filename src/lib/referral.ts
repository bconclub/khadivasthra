import type { AppliedCoupon } from "@/types";

/**
 * A referral link (`?ref=PRIYA`) is the same thing as a coupon code, remembered
 * for the visitor so it applies itself at checkout. It lives in localStorage
 * for 30 days: long enough to survive a browse-now, buy-later, short enough
 * that an old link does not attribute a sale a month after the campaign.
 */
const KEY = "khadi_coupon";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface Stored extends AppliedCoupon {
  saved_at: number;
}

export function readAppliedCoupon(): AppliedCoupon | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed.code || Date.now() - parsed.saved_at > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return { code: parsed.code, source: parsed.source };
  } catch {
    return null;
  }
}

export function saveAppliedCoupon(coupon: AppliedCoupon): void {
  try {
    const stored: Stored = { ...coupon, code: normaliseCode(coupon.code), saved_at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    /* storage blocked: the code simply will not persist */
  }
}

export function clearAppliedCoupon(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

/** Same normalisation the database applies: trimmed, upper, no spaces. */
export function normaliseCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/** Pull `?ref=` or `?coupon=` off a URL, if present. */
export function referralCodeFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get("ref") || params.get("coupon") || params.get("code");
  if (!raw) return null;
  const code = normaliseCode(raw);
  return code.length > 0 ? code : null;
}

/** The link an influencer shares. */
export function referralLink(code: string, origin = "https://khadivasthra.com"): string {
  return `${origin}/?ref=${encodeURIComponent(normaliseCode(code))}`;
}
