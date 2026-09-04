import type { OrderItem } from "@/types";

/**
 * "Off-White / S" — the variant a customer actually bought.
 *
 * Orders store colour and size on each line, but nothing displayed them, so
 * neither the packing team nor the customer could tell which size was ordered.
 * Returns an empty string for products sold in a single variant.
 */
export function variantLabel(item: Pick<OrderItem, "color_name" | "size">): string {
  return [item.color_name, item.size].filter(Boolean).join(" / ");
}

/** "BEYE Cotton Shirt (Off-White / S) x1" for one-line summaries. */
export function itemSummary(item: OrderItem): string {
  const variant = variantLabel(item);
  return `${item.product_name}${variant ? ` (${variant})` : ""} x${item.quantity}`;
}

/**
 * "Any 3 Mundus" when the line was bought inside a combo, otherwise "".
 *
 * A combo is stored as one ordinary line per piece, so without this the packing
 * team sees three unrelated products at odd prices and cannot tell they belong
 * in one parcel as one offer.
 */
export function comboLabel(item: Pick<OrderItem, "combo">): string {
  return item.combo?.combo_name ?? "";
}

/** "BEYE Cotton Shirt (Off-White / S) [Any 3 Mundus] x1" for one-line summaries. */
export function itemSummaryWithCombo(item: OrderItem): string {
  const combo = comboLabel(item);
  return `${itemSummary(item)}${combo ? ` [${combo}]` : ""}`;
}
