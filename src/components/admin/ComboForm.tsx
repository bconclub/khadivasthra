"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { uploadBannerImage } from "@/lib/services/storage";
import { ProductPicker } from "@/components/admin/ProductPicker";
import { storageImage, IMG } from "@/lib/image";
import type { Combo } from "@/types";
import { Upload, X, Loader2 } from "lucide-react";

interface ComboFormProps {
  combo?: Combo;
  initialProductIds?: string[];
  onSubmit: (data: Record<string, unknown>, productIds: string[]) => Promise<void>;
  onCancel: () => void;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-coral focus:border-transparent";

export function ComboForm({ combo, initialProductIds = [], onSubmit, onCancel }: ComboFormProps) {
  const [name, setName] = useState(combo?.name || "");
  const [slug, setSlug] = useState(combo?.slug || "");
  const [description, setDescription] = useState(combo?.description || "");
  const [imageUrl, setImageUrl] = useState(combo?.image_url || "");
  const [mobileImageUrl, setMobileImageUrl] = useState(combo?.mobile_image_url || "");
  const [comboPrice, setComboPrice] = useState(combo?.combo_price?.toString() || "");
  const [chooseCount, setChooseCount] = useState(combo?.choose_count?.toString() || "3");
  const [allowDuplicates, setAllowDuplicates] = useState(combo?.allow_duplicates ?? false);
  const [isFeatured, setIsFeatured] = useState(combo?.is_featured ?? false);
  const [isActive, setIsActive] = useState(combo?.is_active ?? true);
  const [displayOrder, setDisplayOrder] = useState(combo?.display_order ?? 0);
  const [productIds, setProductIds] = useState<string[]>(initialProductIds);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pick = parseInt(chooseCount, 10) || 0;
  // Without duplicates a shopper cannot pick more items than the pool holds.
  const poolTooSmall = !allowDuplicates && productIds.length > 0 && productIds.length < pick;

  const handleUpload =
    (setter: (url: string) => void) => async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        setter(await uploadBannerImage(file));
      } catch (err) {
        alert(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || poolTooSmall) return;
    setSubmitting(true);
    try {
      await onSubmit(
        {
          name: name.trim(),
          slug: (slug.trim() || slugify(name)).trim(),
          description: description.trim() || null,
          image_url: imageUrl || null,
          mobile_image_url: mobileImageUrl || null,
          combo_price: parseFloat(comboPrice) || 0,
          choose_count: pick || 1,
          allow_duplicates: allowDuplicates,
          is_featured: isFeatured,
          is_active: isActive,
          display_order: displayOrder,
        },
        productIds
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {combo ? "Edit Combo" : "New Combo"}
        </h2>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Combo Name *
          </label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!combo) setSlug(slugify(e.target.value));
            }}
            placeholder="Any 3 Mundus"
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            URL Slug
          </label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="any-3-mundus"
            className={`${inputCls} font-mono`}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Pick any three mundus from the set below for one price."
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* The offer itself */}
      <div className="grid grid-cols-3 gap-3 bg-coral/5 border border-coral/20 rounded-xl p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Combo price (₹) *
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={comboPrice}
            onChange={(e) => setComboPrice(e.target.value)}
            placeholder="999"
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Shopper picks
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={chooseCount}
            onChange={(e) => setChooseCount(e.target.value)}
            className={inputCls}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer pb-2 self-end">
          <input
            type="checkbox"
            checked={allowDuplicates}
            onChange={(e) => setAllowDuplicates(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-coral focus:ring-coral"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Allow the same piece twice
          </span>
        </label>
        <p className="col-span-3 text-xs text-gray-500 dark:text-gray-400">
          The shopper pays {comboPrice ? `₹${comboPrice}` : "the combo price"} whichever{" "}
          {pick || 3} pieces they choose.
        </p>
      </div>

      {/* Photography */}
      <div className="grid grid-cols-2 gap-3">
        {([
          ["Combo Photo", imageUrl, setImageUrl],
          ["Mobile Photo", mobileImageUrl, setMobileImageUrl],
        ] as const).map(([label, url, setter]) => (
          <div key={label}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {label}{" "}
              {label !== "Combo Photo" && (
                <span className="text-gray-400 font-normal">(optional)</span>
              )}
            </label>
            {url ? (
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <Image
                  src={storageImage(url, IMG.card)}
                  alt={label}
                  width={400}
                  height={500}
                  className="w-full aspect-[4/5] object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => setter("")}
                  className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-[4/5] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-coral hover:bg-coral/5">
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-coral" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload(setter)}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      {/* The pool */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <ProductPicker
          value={productIds}
          onChange={setProductIds}
          label="Products the shopper can choose from"
          hint={`Anything in this list is fair game. The shopper picks ${pick || 3}.`}
          emptyText="No products in the pool yet — search above to add them."
        />
        {poolTooSmall && (
          <p className="text-xs text-red-600 mt-2">
            The pool has {productIds.length} products but the shopper must pick {pick}. Add more
            products, or allow the same piece to be picked twice.
          </p>
        )}
      </div>

      {/* Flags */}
      <div className="grid grid-cols-3 gap-3 items-end border-t border-gray-100 dark:border-gray-700 pt-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Display Order</label>
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
            className={inputCls}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-coral focus:ring-coral"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">On homepage</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-coral focus:ring-coral"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!name.trim() || poolTooSmall || submitting}
          className="flex-1"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {combo ? "Update Combo" : "Create Combo"}
        </Button>
      </div>
    </form>
  );
}
