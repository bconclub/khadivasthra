import type { WholesaleCartItem } from "@/types";

/**
 * The trade basket is deliberately its own localStorage key, separate from the
 * retail `khadi_cart`. Retail lines carry retail prices and have no concept of a
 * minimum order quantity; mixing the two in one basket is how wrong-price orders
 * happen.
 */
const KEY = "khadi_wholesale_enquiry";

export function readEnquiryCart(): WholesaleCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WholesaleCartItem[]) : [];
  } catch {
    return [];
  }
}

export function writeEnquiryCart(items: WholesaleCartItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full or blocked — the basket just will not survive a refresh */
  }
}

export function clearEnquiryCart(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

/** A trade line can never fall below the product's minimum order quantity. */
export function clampQty(item: Pick<WholesaleCartItem, "min_qty">, qty: number): number {
  const min = Math.max(1, item.min_qty || 1);
  return Math.max(min, Math.floor(qty) || min);
}

export function addLine(
  items: WholesaleCartItem[],
  line: Omit<WholesaleCartItem, "quantity">,
  qty?: number
): WholesaleCartItem[] {
  const existing = items.find((i) => i.product_id === line.product_id);
  if (existing) {
    return items.map((i) =>
      i.product_id === line.product_id
        ? { ...i, quantity: clampQty(i, i.quantity + (qty ?? i.min_qty)) }
        : i
    );
  }
  return [...items, { ...line, quantity: clampQty(line, qty ?? line.min_qty) }];
}

export function setLineQty(
  items: WholesaleCartItem[],
  productId: string,
  qty: number
): WholesaleCartItem[] {
  return items.map((i) => (i.product_id === productId ? { ...i, quantity: clampQty(i, qty) } : i));
}

export function removeLine(items: WholesaleCartItem[], productId: string): WholesaleCartItem[] {
  return items.filter((i) => i.product_id !== productId);
}

export function enquiryTotals(items: WholesaleCartItem[]) {
  return {
    pieces: items.reduce((n, i) => n + i.quantity, 0),
    total: items.reduce((n, i) => n + i.quantity * i.wholesale_price, 0),
  };
}
