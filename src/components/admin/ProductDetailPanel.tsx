"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getProductColors, getProductVariants } from "@/lib/services/products";
import { getWholesalePrice } from "@/lib/services/wholesale";
import { storageImage, IMG } from "@/lib/image";
import { Button } from "@/components/ui/button";
import type {
  ProductColor,
  ProductVariant,
  ProductWithCategory,
  WholesalePrice,
} from "@/types";
import { X, Pencil, ExternalLink, Loader2 } from "lucide-react";

interface ProductDetailPanelProps {
  product: ProductWithCategory | null;
  onClose: () => void;
  onEdit: (product: ProductWithCategory) => void;
}

const money = (n: number | null | undefined) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`;

/**
 * Everything about one product, in a slide-over on the right of the list.
 * The point is to answer "what is this product?" without leaving the table and
 * loading the whole edit form.
 */
export function ProductDetailPanel({ product, onClose, onEdit }: ProductDetailPanelProps) {
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [trade, setTrade] = useState<WholesalePrice | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!product) return;
    setColors([]);
    setVariants([]);
    setTrade(null);
    setLoading(true);

    const jobs: Promise<unknown>[] = [
      product.is_wholesale
        ? getWholesalePrice(product.id).then(setTrade).catch(() => {})
        : Promise.resolve(),
    ];
    if (product.has_variants) {
      jobs.push(
        getProductColors(product.id).then(setColors).catch(() => {}),
        getProductVariants(product.id).then(setVariants).catch(() => {})
      );
    }
    Promise.all(jobs).finally(() => setLoading(false));
  }, [product]);

  // Rendered but closed so the slide-in transition has something to move from.
  const open = product !== null;

  const gallery = product
    ? [product.image_url, ...(product.images || [])].filter(
        (src, i, all): src is string => Boolean(src) && all.indexOf(src) === i
      )
    : [];

  const stockOf = (colorId: string) =>
    variants
      .filter((v) => v.color_id === colorId)
      .reduce((n, v) => n + (v.stock_quantity || 0), 0);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        {product && (
          <>
            <header className="flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {product.category?.name || "Uncategorised"}
                </p>
                <h2 className="font-bold text-gray-900 dark:text-white leading-tight">
                  {product.name}
                </h2>
                <p className="text-xs text-gray-400 font-mono truncate">{product.slug}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Photos */}
              {gallery.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {gallery.map((src) => (
                    <div
                      key={src}
                      className="relative w-24 h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0"
                    >
                      <Image
                        src={storageImage(src, IMG.thumb)}
                        alt={product.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Money and stock */}
              <Section title="Pricing & stock">
                <Row label="Selling price" value={money(product.price)} strong />
                <Row label="MRP" value={money(product.compare_price)} />
                <Row
                  label="Stock"
                  value={
                    product.has_variants
                      ? `${variants.reduce((n, v) => n + (v.stock_quantity || 0), 0)} across variants`
                      : String(product.stock_quantity)
                  }
                />
                <Row label="In stock" value={product.in_stock ? "Yes" : "No"} />
              </Section>

              {/* Flags */}
              <Section title="Status">
                <div className="flex flex-wrap gap-1.5">
                  <Tag on={product.is_active} label={product.is_active ? "Live" : "Hidden"} />
                  {product.is_featured && <Tag on label="Trending" />}
                  {product.is_best_seller && <Tag on label="Best seller" />}
                  {product.is_new && <Tag on label="New" />}
                  {product.has_variants && <Tag on label="Has variants" />}
                  {product.is_investable && <Tag on label="Investable" />}
                  {product.is_wholesale && <Tag on label="Wholesale" />}
                </div>
              </Section>

              {loading && (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-coral" />
                </div>
              )}

              {/* Variants */}
              {product.has_variants && colors.length > 0 && (
                <Section title={`Colours & sizes (${colors.length})`}>
                  <div className="space-y-2">
                    {colors.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg border border-gray-100 dark:border-gray-700 p-2.5"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-gray-200"
                            style={{ backgroundColor: c.hex_code }}
                          />
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {c.name}
                          </span>
                          <span className="ml-auto text-xs text-gray-400">
                            {stockOf(c.id)} in stock
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {variants
                            .filter((v) => v.color_id === c.id)
                            .map((v) => (
                              <span
                                key={v.id}
                                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                  v.stock_quantity > 0
                                    ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                    : "bg-red-50 text-red-500 line-through"
                                }`}
                                title={v.sku}
                              >
                                {v.size} · {v.stock_quantity}
                              </span>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Wholesale */}
              {product.is_wholesale && (
                <Section title="Wholesale">
                  <Row label="Trade price" value={money(trade?.price)} strong />
                  <Row label="Minimum order" value={trade ? `${trade.min_qty} pieces` : "—"} />
                  {!trade && (
                    <p className="text-xs text-amber-600">
                      Flagged for wholesale but no trade price set yet.
                    </p>
                  )}
                </Section>
              )}

              {/* Investable */}
              {product.is_investable && (
                <Section title="Investable design">
                  <Row label="Design name" value={product.design_name || "—"} />
                  <Row label="Design ID" value={product.design_code || "—"} />
                  <Row label="Manufactured" value={String(product.manufactured_quantity)} />
                  <Row label="Unit cost" value={money(product.unit_cost)} />
                </Section>
              )}

              {/* Logistics */}
              <Section title="Shipping">
                <Row label="Weight" value={`${product.weight} kg`} />
                <Row
                  label="Dimensions"
                  value={`${product.length} × ${product.breadth} × ${product.height} cm`}
                />
              </Section>

              {/* Copy */}
              {(product.description || product.material) && (
                <Section title="Details">
                  {product.material && <Row label="Material" value={product.material} />}
                  {product.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {product.description}
                    </p>
                  )}
                </Section>
              )}

              <Section title="Record">
                <Row
                  label="Created"
                  value={new Date(product.created_at).toLocaleDateString("en-IN")}
                />
                <Row
                  label="Updated"
                  value={new Date(product.updated_at).toLocaleDateString("en-IN")}
                />
                <Row label="Display order" value={String(product.display_order)} />
              </Section>
            </div>

            <footer className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
              <Button variant="primary" className="flex-1" onClick={() => onEdit(product)}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </Button>
              <a
                href={`/product/${product.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-coral hover:text-coral"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={`text-right ${
          strong
            ? "font-semibold text-gray-900 dark:text-white"
            : "text-gray-700 dark:text-gray-300"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Tag({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
        on
          ? "bg-coral/10 text-coral"
          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
      }`}
    >
      {label}
    </span>
  );
}
