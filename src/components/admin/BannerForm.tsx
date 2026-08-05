"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { uploadBannerImage } from "@/lib/services/storage";
import type { Banner, BannerPlacement } from "@/types";
import { Upload, X, Loader2 } from "lucide-react";

interface BannerFormProps {
  banner?: Banner;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

const PLACEMENTS: { value: BannerPlacement; label: string; desc: string }[] = [
  { value: "hero_background", label: "Hero Background", desc: "The big cover image behind the logo at the top" },
  { value: "homepage_hero", label: "Homepage Hero Strip", desc: "Full-width, right below the main hero" },
  { value: "heritage", label: "Heritage Photo", desc: "Image beside the \"Since 2007\" story section" },
  { value: "shop", label: "Shop Page", desc: "Between products on the shop page" },
  { value: "offers", label: "Offers Page", desc: "Featured on the offers page" },
  { value: "general", label: "Homepage Cards", desc: "3-up promo grid on the homepage" },
];

export function BannerForm({ banner, onSubmit, onCancel }: BannerFormProps) {
  const [imageUrl, setImageUrl] = useState(banner?.image_url || "");
  const [mobileImageUrl, setMobileImageUrl] = useState(banner?.mobile_image_url || "");
  const [placement, setPlacement] = useState<BannerPlacement>(banner?.placement || "homepage_hero");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUpload = (setter: (url: string) => void) => async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!imageUrl) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: banner?.title || "",
        subtitle: null,
        image_url: imageUrl,
        mobile_image_url: mobileImageUrl || null,
        size: "wide",
        placement,
        link_type: "none",
        link_value: null,
        display_order: banner?.display_order ?? 0,
        is_active: banner?.is_active ?? true,
        starts_at: null,
        ends_at: null,
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
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {banner ? "Edit Banner" : "New Banner"}
        </h2>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Desktop Banner * <span className="text-gray-400 font-normal">(2172×724px)</span>
        </label>
        {imageUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <Image
              src={imageUrl}
              alt="Banner"
              width={600}
              height={200}
              className="w-full aspect-[3/1] object-cover"
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
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload(setImageUrl)} />
          </label>
        )}
      </div>

      {/* Mobile Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Mobile Banner <span className="text-gray-400 font-normal">(1448×1086px, optional)</span>
        </label>
        {mobileImageUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 w-36">
            <Image
              src={mobileImageUrl}
              alt="Mobile banner"
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
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload(setMobileImageUrl)} />
          </label>
        )}
      </div>

      {/* Placement */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Where should this show?</label>
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

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!imageUrl || submitting} className="flex-1">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {banner ? "Update Banner" : "Add Banner"}
        </Button>
      </div>
    </form>
  );
}
