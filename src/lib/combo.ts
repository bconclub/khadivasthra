import type { CartItem, ComboLineMeta } from "@/types";

/**
 * Combo pricing and grouping helpers.
 *
 * A combo is stored in the cart and the order as one ordinary line per piece,
 * all sharing a `combo_line` key. That keeps stock decrement, the invoice, the
 * packing sticker and the investor payout functions working with no
 * combo-specific handling — they all read `product_id` off a normal line. The
 * fixed combo price is spread across those lines so the cart total is exactly
 * the combo price, whichever pieces the shopper picked.
 */

/**
 * Split a fixed price across n lines in whole rupees. Any remainder goes onto
 * the first line, so the parts always add back up to exactly the combo price.
 */
export function apportion(total: number, n: number): number[] {
  if (n <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const parts = Array<number>(n).fill(base);
  parts[0] += cents - base * n;
  return parts.map((c) => c / 100);
}

/**
 * A stable key for one configured combo. Two shoppers who pick the same pieces
 * get the same key (so a repeat merges into one line pair), while a different
 * selection gets a different key.
 */
export function comboLineKey(comboId: string, selectionIds: string[]): string {
  return `combo-${comboId}-${[...selectionIds].sort().join("_")}`;
}


export type CartGroup =
  | { kind: "item"; key: string; item: CartItem }
  | { kind: "combo"; key: string; combo: ComboLineMeta; lines: CartItem[]; quantity: number };

/**
 * Fold the flat cart into what the shopper should actually see: loose lines as
 * themselves, and the pieces of one configured combo as a single block. The
 * underlying lines are left untouched — only the display is grouped.
 */
export function groupCart(items: CartItem[]): CartGroup[] {
  const groups: CartGroup[] = [];
  const seen = new Map<string, number>();

  items.forEach((item, i) => {
    const line = item.combo?.combo_line;
    if (!line) {
      groups.push({ kind: "item", key: `${item.id}-${item.variant_id ?? ""}-${i}`, item });
      return;
    }
    const at = seen.get(line);
    if (at === undefined) {
      seen.set(line, groups.length);
      groups.push({
        kind: "combo",
        key: line,
        combo: item.combo!,
        lines: [item],
        // Every piece of a combo moves together, so one line's quantity is the
        // number of copies of the whole combo.
        quantity: item.quantity,
      });
    } else {
      (groups[at] as Extract<CartGroup, { kind: "combo" }>).lines.push(item);
    }
  });

  return groups;
}
