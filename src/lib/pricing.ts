/** Cash-on-delivery fee: 1.6% of the order, plus 18% GST on that fee. */
export const COD_RATE = 0.016;
export const COD_GST_RATE = 0.18;

/** Keep in step with orders_apply_coupon() in the database, which has the final say. */
export function codCharge(amount: number): number {
  return Math.round(amount * COD_RATE * (1 + COD_GST_RATE));
}

/** Defaults for the price calculator on the admin product form. */
export const DEFAULT_COURIER_CHARGE = 49;
export const DEFAULT_GST_PERCENT = 5;

export interface PriceBreakdown {
  gst: number;
  courierGst: number;
  /** What the shopper pays: everything above, inclusive, rounded to the rupee. */
  sellingPrice: number;
  /** The MRP that lands on sellingPrice once the offer is taken off. */
  mrp: number;
}

export function buildPrice(input: {
  productPrice: number;
  gstPercent: number;
  courierCharge: number;
  courierGstPercent: number;
  offerPercent: number;
}): PriceBreakdown {
  const gst = input.productPrice * (input.gstPercent / 100);
  const courierGst = input.courierCharge * (input.courierGstPercent / 100);
  const sellingPrice = Math.round(input.productPrice + gst + input.courierCharge + courierGst);
  const mrp = input.offerPercent > 0 && input.offerPercent < 100
    ? Math.round(sellingPrice / (1 - input.offerPercent / 100))
    : sellingPrice;
  return { gst, courierGst, sellingPrice, mrp };
}
