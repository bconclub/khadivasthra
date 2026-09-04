"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getComboBySlug } from "@/lib/services/combos";
import { apportion, comboLineKey } from "@/lib/combo";
import { storageImage, IMG } from "@/lib/image";
import { Button } from "@/components/ui/button";
import type { ProductVariant, ProductWithCategory } from "@/types";
import { Loader2, ChevronLeft, X, Check } from "lucide-react";

const money = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

/** One filled slot in the combo. */
interface Picked {
  uid: string;
  product: ProductWithCategory;
  variant?: ProductVariant;
  colorName?: string;
  size?: string;
}

export default function ComboClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { addComboToCart } = useCart();
  const { data: combo, loading } = useSupabaseQuery(() => getComboBySlug(slug), [slug]);

  const [picked, setPicked] = useState<Picked[]>([]);
  const [choosingFor, setChoosingFor] = useState<ProductWithCategory | null>(null);

  const pool = useMemo(() => combo?.products || [], [combo]);
  const need = combo?.choose_count ?? 0;
  const complete = picked.length === need && need > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  if (!combo) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text mb-3">Combo not found</h1>
          <p className="text-text-muted mb-6">This offer may have ended.</p>
          <Link href="/combos" className="inline-flex items-center gap-2 text-coral hover:underline">
            <ChevronLeft className="w-4 h-4" /> See all combos
          </Link>
        </div>
      </div>
    );
  }

  const alreadyPicked = (productId: string) => picked.some((p) => p.product.id === productId);

  const canPick = (product: ProductWithCategory) =>
    picked.length < need && (combo.allow_duplicates || !alreadyPicked(product.id));

  const choose = (product: ProductWithCategory) => {
    if (!canPick(product)) return;
    // A product with variants needs a colour and size before it can be packed.
    if (product.has_variants && (product.variants?.length ?? 0) > 0) {
      setChoosingFor(product);
      return;
    }
    setPicked((prev) => [...prev, { uid: `${product.id}-${prev.length}`, product }]);
  };

  const confirmVariant = (
    product: ProductWithCategory,
    variant: ProductVariant,
    colorName: string
  ) => {
    setPicked((prev) => [
      ...prev,
      { uid: `${variant.id}-${prev.length}`, product, variant, colorName, size: variant.size },
    ]);
    setChoosingFor(null);
  };

  const addToCart = () => {
    const parts = apportion(Number(combo.combo_price), picked.length);
    const key = comboLineKey(
      combo.id,
      picked.map((p) => p.variant?.id || p.product.id)
    );

    addComboToCart(
      picked.map((p, i) => ({
        id: p.product.id,
        name: p.product.name,
        slug: p.product.slug,
        price: parts[i],
        image: p.product.image_url || "",
        variant_id: p.variant?.id,
        color_id: p.variant?.color_id,
        color_name: p.colorName,
        size: p.size,
        stock: p.variant ? p.variant.stock_quantity : p.product.stock_quantity,
        combo: {
          combo_id: combo.id,
          combo_name: combo.name,
          combo_line: key,
          combo_price: Number(combo.combo_price),
        },
      }))
    );
    setPicked([]);
    router.push("/cart");
  };

  return (
    <div className="min-h-screen bg-cream pb-44 md:pb-12">
      {/* The offer */}
      <div className="container mx-auto px-4 max-w-7xl pt-4 pb-8">
        <Link
          href="/combos"
          className="inline-flex items-center gap-1 text-coral hover:underline text-sm mb-3"
        >
          <ChevronLeft className="w-4 h-4" /> All combos
        </Link>

        <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center">
          {combo.image_url && (
            <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-lg bg-white/50">
              <Image
                src={storageImage(combo.mobile_image_url || combo.image_url, IMG.card)}
                alt={combo.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover md:hidden"
                priority
                unoptimized
              />
              <Image
                src={storageImage(combo.image_url, IMG.hero)}
                alt={combo.name}
                fill
                sizes="50vw"
                className="object-cover hidden md:block"
                priority
                unoptimized
              />
            </div>
          )}

          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-coral/10 text-coral text-xs font-semibold uppercase tracking-wider mb-3">
              Combo offer
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-text font-serif mb-3">{combo.name}</h1>
            {combo.description && (
              <p className="text-text-muted text-base md:text-lg leading-relaxed mb-4">
                {combo.description}
              </p>
            )}
            <p className="text-2xl font-bold text-text">
              {money(combo.combo_price)}{" "}
              <span className="text-base font-normal text-text-muted">
                for any {need} pieces
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* What you have picked so far */}
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-text">Your combo</h2>
            <span className={`text-sm font-medium ${complete ? "text-green-600" : "text-coral"}`}>
              {picked.length} of {need} picked
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
            {Array.from({ length: need }).map((_, i) => {
              const slot = picked[i];
              if (!slot) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center"
                  >
                    <span className="text-xs text-gray-300">Pick {i + 1}</span>
                  </div>
                );
              }
              return (
                <div key={slot.uid} className="relative">
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-cream/50">
                    {slot.product.image_url && (
                      <Image
                        src={storageImage(slot.product.image_url, IMG.thumb)}
                        alt={slot.product.name}
                        fill
                        sizes="120px"
                        className="object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                  <button
                    onClick={() => setPicked((prev) => prev.filter((p) => p.uid !== slot.uid))}
                    className="absolute -top-1.5 -right-1.5 bg-white shadow rounded-full p-1 text-gray-500 hover:text-red-500"
                    aria-label={`Remove ${slot.product.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {(slot.colorName || slot.size) && (
                    <p className="text-[10px] text-text-muted mt-1 text-center truncate">
                      {[slot.colorName, slot.size].filter(Boolean).join(" / ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden md:block mt-4">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!complete}
              onClick={addToCart}
            >
              {complete
                ? `Add combo to cart · ${money(combo.combo_price)}`
                : `Pick ${need - picked.length} more`}
            </Button>
          </div>
        </div>
      </div>

      {/* The pool */}
      <div className="container mx-auto px-4 max-w-7xl pb-12">
        <h2 className="text-xl md:text-2xl font-bold text-text font-serif mb-4">
          Choose from these
        </h2>

        {pool.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl">
            <p className="text-text-muted">Nothing has been added to this combo yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
            {pool.map((product) => {
              const used = alreadyPicked(product.id) && !combo.allow_duplicates;
              const disabled = used || picked.length >= need;
              return (
                <button
                  key={product.id}
                  onClick={() => choose(product)}
                  disabled={disabled}
                  className={`text-left bg-white rounded-2xl overflow-hidden shadow-sm border transition-colors ${
                    used ? "border-coral" : "border-gray-100"
                  } ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-coral"}`}
                >
                  <div className="relative aspect-[3/4] bg-cream/50">
                    {product.image_url && (
                      <Image
                        src={storageImage(product.image_url, IMG.card)}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                        unoptimized
                      />
                    )}
                    {used && (
                      <span className="absolute top-2 right-2 bg-coral text-white rounded-full p-1">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-text-muted">{product.category?.name}</p>
                    <h3 className="text-sm font-semibold text-text leading-snug line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-xs text-text-muted mt-1 line-through">
                      {money(product.price)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile add bar. Sits above the site quick-action bar (fixed, h-16,
          z-50) rather than under it. */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 p-3 z-40">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!complete}
          onClick={addToCart}
        >
          {complete
            ? `Add combo · ${money(combo.combo_price)}`
            : `Pick ${need - picked.length} more`}
        </Button>
      </div>

      {choosingFor && (
        <VariantPicker
          product={choosingFor}
          onCancel={() => setChoosingFor(null)}
          onConfirm={(variant, colorName) => confirmVariant(choosingFor, variant, colorName)}
        />
      )}
    </div>
  );
}

/** Colour and size for one piece, before it goes into a slot. */
function VariantPicker({
  product,
  onConfirm,
  onCancel,
}: {
  product: ProductWithCategory;
  onConfirm: (variant: ProductVariant, colorName: string) => void;
  onCancel: () => void;
}) {
  const colors = product.colors || [];
  const variants = (product.variants || []).filter((v) => v.is_active && v.stock_quantity > 0);
  const [colorId, setColorId] = useState<string>(colors[0]?.id || "");

  const sizes = variants.filter((v) => v.color_id === colorId);
  const colorName = colors.find((c) => c.id === colorId)?.name || "";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-text">{product.name}</h3>
            <p className="text-sm text-text-muted">Pick a colour and size</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {colors.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Colour</p>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColorId(c.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    colorId === c.id
                      ? "border-coral bg-coral/10 text-coral font-medium"
                      : "border-gray-200 text-text-muted"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Size</p>
          {sizes.length === 0 ? (
            <p className="text-sm text-text-muted">
              Nothing in stock in this colour. Try another one.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sizes.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onConfirm(v, colorName)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-text hover:border-coral hover:text-coral"
                >
                  {v.size}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
