/** Cash-on-delivery fee: 1.6% of the order, plus 18% GST on that fee. */
export const COD_RATE = 0.016;
export const COD_GST_RATE = 0.18;

/** Keep in step with orders_apply_coupon() in the database, which has the final say. */
export function codCharge(amount: number): number {
  return Math.round(amount * COD_RATE * (1 + COD_GST_RATE));
}

/** GST rates a product can carry. Khadi clothing is normally 5%. */
export const GST_RATES = [5, 12, 18] as const;
export const DEFAULT_GST_RATE = 5;
/** Default store landing cost per product: handling plus delivery and its GST. */
export const DEFAULT_LANDING_COST = 100;

/** Production cost + landing cost, plus the profit margin on top. */
export function costPrice(production: number, landing: number, marginPercent: number): number {
  const cost = Math.max(production, 0) + Math.max(landing, 0);
  return Math.round(cost * (1 + Math.max(marginPercent, 0) / 100) * 100) / 100;
}

export interface ProductPrice {
  offerAmount: number;
  afterOffer: number;
  gst: number;
  /** What the shopper pays: price after the offer, plus GST, to the rupee. */
  price: number;
  /** Struck-through price: the product price plus GST, before the offer. */
  mrp: number;
}

/**
 * The product price covers cost, landing and margin. The site takes the
 * offer off it, then adds GST (gstPercent 0 when GST is switched off).
 */
export function productPrice(basePrice: number, offerPercent: number, gstPercent = DEFAULT_GST_RATE): ProductPrice {
  const rate = Math.max(gstPercent, 0) / 100;
  const offerAmount = basePrice * (Math.max(offerPercent, 0) / 100);
  const afterOffer = basePrice - offerAmount;
  const gst = afterOffer * rate;
  return {
    offerAmount,
    afterOffer,
    gst,
    price: Math.round(afterOffer + gst),
    mrp: Math.round(basePrice * (1 + rate)),
  };
}

/** For products saved before the product price was stored: back it out of what the shopper pays. */
export function basePriceFrom(price: number, offerPercent: number, gstPercent = DEFAULT_GST_RATE): number {
  const beforeGst = price / (1 + Math.max(gstPercent, 0) / 100);
  const base = offerPercent > 0 && offerPercent < 100 ? beforeGst / (1 - offerPercent / 100) : beforeGst;
  return Math.round(base * 100) / 100;
}
