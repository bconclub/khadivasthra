"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "./ImageUpload";
import { uploadProductImage } from "@/lib/services/storage";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getCategories } from "@/lib/services/categories";
import type { Product } from "@/types";
import { Loader2, X, Plus } from "lucide-react";
import Image from "next/image";

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const { data: categories } = useSupabaseQuery(getCategories);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(product?.name || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [description, setDescription] = useState(product?.description || "");
  const [longDescription, setLongDescription] = useState(product?.long_description || "");
  // Pricing: MRP is the base, discount % is selected, sale price is calculated
  const [comparePrice, setComparePrice] = useState(product?.compare_price?.toString() || product?.price?.toString() || "");
  // Calculate initial discount from existing product data
  const initialDiscount = (() => {
    if (product?.compare_price && product?.price && Number(product.compare_price) > Number(product.price)) {
      const raw = Math.round(((Number(product.compare_price) - Number(product.price)) / Number(product.compare_price)) * 100);
      // Snap to nearest 5
      const snapped = Math.round(raw / 5) * 5;
      return Math.min(30, Math.max(0, snapped));
    }
    return 0;
  })();
  const [discountPct, setDiscountPct] = useState(initialDiscount);
  const [categoryId, setCategoryId] = useState(product?.category_id || "");
  const [material, setMaterial] = useState(product?.material || "");
  const [imageUrl, setImageUrl] = useState(product?.image_url || "");
  const [galleryImages, setGalleryImages] = useState<string[]>(product?.images || []);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured || false);
  const [isBestSeller, setIsBestSeller] = useState(product?.is_best_seller || false);
  const [isActive, setIsActive] = useState(product?.is_active !== false);
  const [stockQuantity, setStockQuantity] = useState(product?.stock_quantity?.toString() || "0");
  const [careInstructions, setCareInstructions] = useState<string[]>(
    product?.care_instructions || ["Hand wash cold", "Dry in shade"]
  );
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Calculate sale price from MRP and discount
  const mrpNum = parseFloat(comparePrice) || 0;
  const calculatedSalePrice = discountPct > 0 && mrpNum > 0
    ? Math.round(mrpNum * (1 - discountPct / 100))
    : mrpNum;
  const hasDiscount = discountPct > 0 && mrpNum > 0;

  const handleNameChange = (value: string) => {
    setName(value);
    if (!product) {
      setSlug(slugify(value));
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingGallery(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 5 * 1024 * 1024) continue;
        const url = await uploadProductImage(file, slug || slugify(name));
        newUrls.push(url);
      }
      setGalleryImages([...galleryImages, ...newUrls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gallery upload failed");
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !mrpNum || !categoryId) {
      setError("Name, MRP, and category are required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name,
        slug,
        description,
        long_description: longDescription,
        price: calculatedSalePrice,
        compare_price: hasDiscount ? mrpNum : null,
        category_id: categoryId,
        material,
        image_url: imageUrl,
        images: galleryImages,
        is_featured: isFeatured,
        is_best_seller: isBestSeller,
        is_active: isActive,
        stock_quantity: parseInt(stockQuantity) || 0,
        in_stock: (parseInt(stockQuantity) || 0) > 0,
        care_instructions: careInstructions.filter(Boolean),
        display_order: product?.display_order ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
      setSubmitting(false);
    }
  };

  const addCareInstruction = () => setCareInstructions([...careInstructions, ""]);
  const removeCareInstruction = (index: number) =>
    setCareInstructions(careInstructions.filter((_, i) => i !== index));
  const updateCareInstruction = (index: number, value: string) =>
    setCareInstructions(careInstructions.map((v, i) => (i === index ? value : v)));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {product ? "Edit Product" : "Add Product"}
        </h2>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent font-mono text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Long Description</label>
        <textarea
          rows={4}
          value={longDescription}
          onChange={(e) => setLongDescription(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
        />
      </div>

      {/* Pricing */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Pricing</label>
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">MRP (₹) *</label>
            <input
              type="number"
              required
              step="1"
              value={comparePrice}
              onChange={(e) => setComparePrice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent text-lg font-semibold"
              placeholder="Original price"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Discount %</label>
            <select
              value={discountPct}
              onChange={(e) => setDiscountPct(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent text-lg font-semibold"
            >
              {[0, 5, 10, 15, 20, 25, 30].map((pct) => (
                <option key={pct} value={pct}>
                  {pct === 0 ? "No discount" : `${pct}% OFF`}
                </option>
              ))}
            </select>
          </div>
          <div>
            {mrpNum > 0 ? (
              <div className={`${hasDiscount ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border rounded-lg px-3 py-2 text-center`}>
                <p className="text-xs text-gray-500 mb-0.5">Selling Price</p>
                <span className={`font-bold text-xl ${hasDiscount ? 'text-green-700' : 'text-gray-700'}`}>₹{calculatedSalePrice}</span>
                {hasDiscount && (
                  <p className="text-xs text-green-600">
                    <span className="line-through">₹{mrpNum}</span> → ₹{calculatedSalePrice}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center text-sm text-gray-400">
                Enter MRP to see selling price
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
          >
            <option value="">Select category</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
          <input
            type="text"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
            placeholder="e.g., 100% Cotton"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
          <input
            type="number"
            min="0"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
            placeholder="0"
          />
          <p className={`text-xs mt-1 ${(parseInt(stockQuantity) || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {(parseInt(stockQuantity) || 0) > 0 ? `${stockQuantity} in stock` : 'Out of stock'}
          </p>
        </div>
      </div>

      {/* Main Image */}
      <ImageUpload
        currentUrl={imageUrl}
        onUpload={async (file) => {
          const url = await uploadProductImage(file, slug || slugify(name));
          setImageUrl(url);
          return url;
        }}
        onRemove={() => setImageUrl("")}
        label="Main Product Image"
      />

      {/* Gallery Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gallery Images
          <span className="text-gray-400 font-normal ml-2">({galleryImages.length} images)</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {galleryImages.map((url, index) => (
            <div key={index} className="relative w-24 h-32 rounded-lg overflow-hidden border border-gray-200 group">
              <Image
                src={url}
                alt={`Gallery ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => removeGalleryImage(index)}
                className="absolute top-1 right-1 bg-white/90 p-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
              >
                <X className="w-3 h-3 text-red-500" />
              </button>
            </div>
          ))}

          {/* Add button */}
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={uploadingGallery}
            className="w-24 h-32 rounded-lg border-2 border-dashed border-gray-300 hover:border-coral/50 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50"
          >
            {uploadingGallery ? (
              <Loader2 className="w-5 h-5 animate-spin text-coral" />
            ) : (
              <>
                <Plus className="w-5 h-5 text-gray-400" />
                <span className="text-xs text-gray-400 mt-1">Add</span>
              </>
            )}
          </button>
        </div>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleGalleryUpload}
          className="hidden"
        />
        <p className="text-xs text-gray-400 mt-2">Upload multiple images for the product gallery.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Care Instructions</label>
        <div className="space-y-2">
          {careInstructions.map((instruction, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={instruction}
                onChange={(e) => updateCareInstruction(i, e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent text-sm"
                placeholder="Care instruction"
              />
              <button
                type="button"
                onClick={() => removeCareInstruction(i)}
                className="px-2 text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addCareInstruction}
            className="text-sm text-coral hover:underline"
          >
            + Add instruction
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="rounded border-gray-300 text-coral focus:ring-coral" />
          <span className="text-sm text-gray-700">Featured</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isBestSeller} onChange={(e) => setIsBestSeller(e.target.checked)} className="rounded border-gray-300 text-coral focus:ring-coral" />
          <span className="text-sm text-gray-700">Best Seller</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300 text-coral focus:ring-coral" />
          <span className="text-sm text-gray-700">Active</span>
        </label>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button type="submit" variant="primary" disabled={submitting} className="flex-1">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : product ? "Update Product" : "Create Product"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
