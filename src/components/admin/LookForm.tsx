"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { uploadBannerImage } from "@/lib/services/storage";
import { ProductPicker } from "@/components/admin/ProductPicker";
import { storageImage, IMG } from "@/lib/image";
import type { Look } from "@/types";
import { Upload, X, Loader2 } from "lucide-react";

interface LookFormProps {
  look?: Look;
  initialProductIds?: string[];
  onSubmit: (data: Record<string, unknown>, productIds: string[]) => Promise<void>;
  onCancel: () => void;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-coral focus:border-transparent";

export function LookForm({ look, initialProductIds = [], onSubmit, onCancel }: LookFormProps) {
  const [name, setName] = useState(look?.name || "");
  const [slug, setSlug] = useState(look?.slug || "");
  const [description, setDescription] = useState(look?.description || "");
  const [imageUrl, setImageUrl] = useState(look?.image_url || "");
  const [mobileImageUrl, setMobileImageUrl] = useState(look?.mobile_image_url || "");
  const [isFeatured, setIsFeatured] = useState(look?.is_featured ?? false);
  const [isActive, setIsActive] = useState(look?.is_active ?? true);
  const [displayOrder, setDisplayOrder] = useState(look?.display_order ?? 0);
  const [productIds, setProductIds] = useState<string[]>(initialProductIds);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);


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
    if (!name.trim() || !imageUrl) return;
    setSubmitting(true);
    try {
      await onSubmit(
        {
          name: name.trim(),
          slug: (slug.trim() || slugify(name)).trim(),
          description: description.trim() || null,
          image_url: imageUrl,
          mobile_image_url: mobileImageUrl || null,
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
          {look ? "Edit Look" : "New Look"}
        </h2>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Look Name *
          </label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!look) setSlug(slugify(e.target.value));
            }}
            placeholder="Onam Family Look"
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
            placeholder="onam-family-look"
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
          placeholder="Styled for Onam mornings - kasavu mundu with a linen shirt."
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Look photography */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Look Photo *
          </label>
          {imageUrl ? (
            <div className="relative rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={storageImage(imageUrl, IMG.card)}
                alt="Look"
                width={400}
                height={500}
                className="w-full aspect-[4/5] object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
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
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload(setImageUrl)} />
            </label>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mobile Photo <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          {mobileImageUrl ? (
            <div className="relative rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={storageImage(mobileImageUrl, IMG.card)}
                alt="Look mobile"
                width={400}
                height={500}
                className="w-full aspect-[4/5] object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => setMobileImageUrl("")}
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
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload(setMobileImageUrl)} />
            </label>
          )}
        </div>
      </div>

      {/* Products in this look */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <ProductPicker
          value={productIds}
          onChange={setProductIds}
          label="Products in this look"
          hint="Add the shirt, the mundu, the pair together, accessories - whatever a shopper should be able to buy from this look."
        />
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
          disabled={!name.trim() || !imageUrl || submitting}
          className="flex-1"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {look ? "Update Look" : "Create Look"}
        </Button>
      </div>
    </form>
  );
}
