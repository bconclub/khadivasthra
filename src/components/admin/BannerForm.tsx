"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { uploadBannerImage } from "@/lib/services/storage";
import { getCategories } from "@/lib/services/categories";
import { getProducts } from "@/lib/services/products";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import type { Banner, BannerSize, BannerLinkType, BannerPlacement } from "@/types";
import { Upload, X, Loader2 } from "lucide-react";

interface BannerFormProps {
  banner?: Banner;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

const SIZES: { value: BannerSize; label: string; desc: string }[] = [
  { value: "hero", label: "Hero", desc: "Full-width banner (16:9)" },
  { value: "wide", label: "Wide", desc: "Wide banner (3:1)" },
  { value: "square", label: "Square", desc: "Square banner (1:1)" },
  { value: "tall", label: "Tall", desc: "Tall banner (2:3)" },
];

const PLACEMENTS: { value: BannerPlacement; label: string; desc: string }[] = [
  { value: "homepage_hero", label: "Homepage Hero Strip", desc: "Full-width, right below the main hero" },
  { value: "shop", label: "Shop Page", desc: "Between products on the shop page" },
  { value: "offers", label: "Offers Page", desc: "Featured on the offers page" },
  { value: "general", label: "Homepage Cards", desc: "3-up promo grid on the homepage" },
];

const LINK_TYPES: { value: BannerLinkType; label: string }[] = [
  { value: "none", label: "No Link" },
  { value: "product", label: "Link to Product" },
  { value: "category", label: "Link to Collection" },
  { value: "url", label: "External URL" },
];

export function BannerForm({ banner, onSubmit, onCancel }: BannerFormProps) {
  const [title, setTitle] = useState(banner?.title || "");
  const [subtitle, setSubtitle] = useState(banner?.subtitle || "");
  const [imageUrl, setImageUrl] = useState(banner?.image_url || "");
  const [mobileImageUrl, setMobileImageUrl] = useState(banner?.mobile_image_url || "");
  const [size, setSize] = useState<BannerSize>(banner?.size || "wide");
  const [placement, setPlacement] = useState<BannerPlacement>(banner?.placement || "general");
  const [linkType, setLinkType] = useState<BannerLinkType>(banner?.link_type || "none");
  const [linkValue, setLinkValue] = useState(banner?.link_value || "");
  const [displayOrder, setDisplayOrder] = useState(banner?.display_order ?? 0);
  const [isActive, setIsActive] = useState(banner?.is_active ?? true);
  const [startsAt, setStartsAt] = useState(banner?.starts_at ? banner.starts_at.slice(0, 16) : "");
  const [endsAt, setEndsAt] = useState(banner?.ends_at ? banner.ends_at.slice(0, 16) : "");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: categories } = useSupabaseQuery(getCategories);
  const { data: products } = useSupabaseQuery(getProducts);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadBannerImage(file);
      setImageUrl(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleMobileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadBannerImage(file);
      setMobileImageUrl(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        image_url: imageUrl,
        mobile_image_url: mobileImageUrl || null,
        size,
        placement,
        link_type: linkType,
        link_value: linkType === "none" ? null : linkValue || null,
        display_order: displayOrder,
        is_active: isActive,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          {banner ? "Edit Banner" : "New Banner"}
        </h2>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
          placeholder="e.g. Summer Sale - 30% Off"
          required
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
        <input
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
          placeholder="e.g. Limited time offer on Kerala mundus"
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Desktop Banner Image * <span className="text-gray-400 font-normal">(2172×724px)</span></label>
        {imageUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <Image
              src={imageUrl}
              alt="Banner preview"
              width={600}
              height={200}
              className="w-full h-40 object-cover"
              unoptimized
            />
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-white"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-coral hover:bg-coral/5 transition-colors">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-coral" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-sm text-gray-500">Click to upload</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        )}
      </div>

      {/* Mobile Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Banner Image <span className="text-gray-400 font-normal">(1448×1086px, optional — falls back to desktop image)</span></label>
        {mobileImageUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 w-32 mx-auto">
            <Image
              src={mobileImageUrl}
              alt="Mobile banner preview"
              width={200}
              height={150}
              className="w-full aspect-[4/3] object-cover"
              unoptimized
            />
            <button
              type="button"
              onClick={() => setMobileImageUrl("")}
              className="absolute top-1 right-1 bg-white/90 p-1 rounded-full shadow hover:bg-white"
            >
              <X className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-coral hover:bg-coral/5 transition-colors">
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-coral" />
            ) : (
              <>
                <Upload className="w-5 h-5 text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">Click to upload</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleMobileImageUpload} />
          </label>
        )}
      </div>

      {/* Placement */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Where should this show?</label>
        <div className="grid grid-cols-2 gap-2">
          {PLACEMENTS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPlacement(p.value)}
              className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                placement === p.value
                  ? "border-coral bg-coral/10 text-coral"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <span className="font-medium">{p.label}</span>
              <span className="block text-xs text-gray-400 mt-0.5">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Banner Size</label>
        <div className="grid grid-cols-2 gap-2">
          {SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSize(s.value)}
              className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                size === s.value
                  ? "border-coral bg-coral/10 text-coral"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <span className="font-medium">{s.label}</span>
              <span className="block text-xs text-gray-400 mt-0.5">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Link Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Link To</label>
        <select
          value={linkType}
          onChange={(e) => {
            setLinkType(e.target.value as BannerLinkType);
            setLinkValue("");
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
        >
          {LINK_TYPES.map((lt) => (
            <option key={lt.value} value={lt.value}>{lt.label}</option>
          ))}
        </select>
      </div>

      {/* Link Value */}
      {linkType === "product" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Product</label>
          <select
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
          >
            <option value="">Choose a product...</option>
            {products?.map((p) => (
              <option key={p.id} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {linkType === "category" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Collection</label>
          <select
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
          >
            <option value="">Choose a collection...</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {linkType === "url" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
          <input
            type="url"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
            placeholder="https://..."
          />
        </div>
      )}

      {/* Display Order & Active */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-coral focus:ring-coral"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>
      </div>

      {/* Schedule */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Starts At (optional)</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ends At (optional)</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!title.trim() || !imageUrl || submitting}
          className="flex-1"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {banner ? "Update Banner" : "Create Banner"}
        </Button>
      </div>
    </form>
  );
}
