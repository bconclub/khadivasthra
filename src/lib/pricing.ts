/** Cash-on-delivery fee: 1.6% of the order, plus 18% GST on that fee. */
export const COD_RATE = 0.016;
export const COD_GST_RATE = 0.18;

/** Keep in step with orders_apply_coupon() in the database, which has the final say. */
export function codCharge(amount: number): number {
  return Math.round(amount * COD_RATE * (1 + COD_GST_RATE));
}

/** Defaults for the price calculator on the admin product form. */
export const DEFAULT_COURIER_CHARGE = 49;
export const DEFAULT_MARGIN_PERCENT = 45;
export const DEFAULT_GST_PERCENT = 5;

export interface PriceBreakdown {
  totalCost: number;
  profit: number;
  beforeGst: number;
  gst: number;
  /** Regular selling price including GST; this becomes the MRP. */
  regular: number;
  offerDiscount: number;
  offerPrice: number;
}

/**
 * The owner's price chart: cost plus a margin that is a share of the price
 * before GST, then GST on top, then the offer taken off the regular price.
 */
export function buildPrice(input: {
  productionCost: number;
  landingCost: number;
  courierCharge: number;
  marginPercent: number;
  gstPercent: number;
  offerPercent: number;
}): PriceBreakdown {
  const totalCost = input.productionCost + input.landingCost + input.courierCharge;
  const margin = Math.min(Math.max(input.marginPercent, 0), 99) / 100;
  const beforeGst = totalCost / (1 - margin);
  const gst = beforeGst * (input.gstPercent / 100);
  const regular = beforeGst + gst;
  const offerDiscount = regular * (Math.max(input.offerPercent, 0) / 100);
  return { totalCost, profit: beforeGst - totalCost, beforeGst, gst, regular, offerDiscount, offerPrice: regular - offerDiscount };
}
