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
