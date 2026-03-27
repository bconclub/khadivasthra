"use client";

import { useState, useRef } from "react";
import { uploadProductImage } from "@/lib/services/storage";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getCategories } from "@/lib/services/categories";
import type { Product } from "@/types";
import { Loader2, X, Plus, Upload, Camera, Package } from "lucide-react";
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
  const [comparePrice, setComparePrice] = useState(product?.compare_price?.toString() || product?.price?.toString() || "");
  const initialDiscount = (() => {
    if (product?.compare_price && product?.price && Number(product.compare_price) > Number(product.price)) {
      const raw = Math.round(((Number(product.compare_price) - Number(product.price)) / Number(product.compare_price)) * 100);
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
  const [colours, setColours] = useState<string[]>(product?.colours || []);
  const [sizes, setSizes] = useState<string[]>(product?.sizes || []);
  const [sizeInput, setSizeInput] = useState("");
  const [weight, setWeight] = useState(product?.weight?.toString() || "0.2");
  const [length, setLength] = useState(product?.length?.toString() || "13");
  const [breadth, setBreadth] = useState(product?.breadth?.toString() || "7");
  const [height, setHeight] = useState(product?.height?.toString() || "3");
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const mainInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const mrpNum = parseFloat(comparePrice) || 0;
  const calculatedSalePrice = discountPct > 0 && mrpNum > 0
    ? Math.round(mrpNum * (1 - discountPct / 100))
    : mrpNum;
  const hasDiscount = discountPct > 0 && mrpNum > 0;

  const handleNameChange = (value: string) => {
    setName(value);
    if (!product) setSlug(slugify(value));
  };

  const handleMainUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;
    setUploadingMain(true);
    try {
      const url = await uploadProductImage(file, slug || slugify(name));
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingMain(false);
      if (mainInputRef.current) mainInputRef.current.value = "";
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) continue;
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
        name, slug, description,
        long_description: longDescription,
        price: calculatedSalePrice,
        compare_price: hasDiscount ? mrpNum : null,
        category_id: categoryId, material,
        image_url: imageUrl, images: galleryImages,
        is_featured: isFeatured, is_best_seller: isBestSeller, is_active: isActive,
        stock_quantity: parseInt(stockQuantity) || 0,
        in_stock: (parseInt(stockQuantity) || 0) > 0,
        care_instructions: careInstructions.filter(Boolean),
        display_order: product?.display_order ?? 0,
        colours,
        sizes,
        weight: parseFloat(weight) || 0.2,
        length: parseFloat(length) || 13,
        breadth: parseFloat(breadth) || 7,
        height: parseFloat(height) || 3,
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

  const addTag = (value: string, list: string[], setList: (v: string[]) => void, setInput: (v: string) => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed]);
    setInput("");
  };
  const removeTag = (index: number, list: string[], setList: (v: string[]) => void) =>
    setList(list.filter((_, i) => i !== index));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-4 px-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl my-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {product ? "Edit Product" : "New Product"}
            </h2>
            <button type="button" onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
            {/* === IMAGES AT TOP === */}
            <div className="flex gap-4">
              {/* Main Image */}
              <div className="flex-shrink-0">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Main Image</label>
                {imageUrl ? (
                  <div className="relative w-32 h-40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                    <Image src={imageUrl} alt="Product" fill className="object-cover" unoptimized />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => { setImageUrl(""); if (mainInputRef.current) mainInputRef.current.value = ""; }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1.5 rounded-full shadow"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => mainInputRef.current?.click()}
                    disabled={uploadingMain}
                    className="w-32 h-40 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-coral/50 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50 dark:bg-gray-800"
                  >
                    {uploadingMain ? (
                      <Loader2 className="w-6 h-6 animate-spin text-coral" />
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-400">Upload</span>
                      </>
                    )}
                  </button>
                )}
                <input ref={mainInputRef} type="file" accept="image/*" onChange={handleMainUpload} className="hidden" />
              </div>

              {/* Gallery */}
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Gallery <span className="text-gray-400 font-normal">({galleryImages.length})</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {galleryImages.map((url, index) => (
                    <div key={index} className="relative w-16 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group flex-shrink-0">
                      <Image src={url} alt={`Gallery ${index + 1}`} fill className="object-cover" unoptimized />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index)}
                        className="absolute top-0.5 right-0.5 bg-white/90 p-0.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploadingGallery}
                    className="w-16 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-coral/50 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50 dark:bg-gray-800 flex-shrink-0"
                  >
                    {uploadingGallery ? (
                      <Loader2 className="w-4 h-4 animate-spin text-coral" />
                    ) : (
                      <Plus className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
              </div>
            </div>

            {/* === BASIC INFO === */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name *</label>
                <input
                  type="text" required value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm"
                  placeholder="Product name"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Slug</label>
                <input
                  type="text" value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm font-mono"
                />
              </div>
            </div>

            {/* Category + Material + Stock */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category *</label>
                <select
                  required value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm"
                >
                  <option value="">Select</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Material</label>
                <input
                  type="text" value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm"
                  placeholder="100% Cotton"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Stock</label>
                <input
                  type="number" min="0" value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* === COLOURS & SIZES === */}
            <div className="grid grid-cols-2 gap-3">
              {/* Colours */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Colours</label>
                <div className="flex flex-wrap gap-1.5 mb-1.5 min-h-[28px]">
                  {colours.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-coral/10 text-coral text-xs px-2 py-0.5 rounded-full">
                      {c}
                      <button type="button" onClick={() => removeTag(i, colours, setColours)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !colours.includes(val)) setColours([...colours, val]);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm"
                >
                  <option value="">+ Add colour</option>
                  {[
                    "White","Off-White","Cream","Ivory","Gold","Silver",
                    "Yellow","Light Yellow","Saffron","Orange","Pink","Rose",
                    "Red","Maroon","Purple","Violet","Blue","Navy Blue",
                    "Sky Blue","Green","Light Green","Olive","Brown","Beige",
                    "Grey","Black","Multi-colour",
                  ].filter(c => !colours.includes(c)).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Sizes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sizes</label>
                <div className="flex flex-wrap gap-1.5 mb-1.5 min-h-[28px]">
                  {sizes.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full">
                      {s}
                      <button type="button" onClick={() => removeTag(i, sizes, setSizes)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text" value={sizeInput}
                    onChange={(e) => setSizeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(sizeInput, sizes, setSizes, setSizeInput); } }}
                    placeholder="e.g. S, M, L, XL"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm"
                  />
                  <button type="button" onClick={() => addTag(sizeInput, sizes, setSizes, setSizeInput)} className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* === PRICING === */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Pricing</label>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">MRP (₹) *</label>
                  <input
                    type="number" required step="1" value={comparePrice}
                    onChange={(e) => setComparePrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-lg font-bold"
                    placeholder="₹"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Discount</label>
                  <select
                    value={discountPct}
                    onChange={(e) => setDiscountPct(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm font-medium"
                  >
                    {[0, 5, 10, 15, 20, 25, 30].map((pct) => (
                      <option key={pct} value={pct}>{pct === 0 ? "No discount" : `${pct}% OFF`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  {mrpNum > 0 ? (
                    <div className={`${hasDiscount ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'} border rounded-lg px-3 py-2 text-center`}>
                      <span className={`font-bold text-xl ${hasDiscount ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>₹{calculatedSalePrice}</span>
                      {hasDiscount && (
                        <p className="text-[10px] text-green-600 dark:text-green-400">
                          <span className="line-through">₹{mrpNum}</span> → ₹{calculatedSalePrice}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-center text-xs text-gray-400">
                      Enter MRP
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* === DESCRIPTIONS === */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Short Description</label>
              <textarea
                rows={2} value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent resize-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Long Description</label>
              <textarea
                rows={3} value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent resize-none text-sm"
              />
            </div>

            {/* === SHIPPING === */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Shipping
              </label>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" min="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm text-center" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">L (cm)</label>
                  <input type="number" step="1" min="1" value={length} onChange={(e) => setLength(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm text-center" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">B (cm)</label>
                  <input type="number" step="1" min="1" value={breadth} onChange={(e) => setBreadth(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm text-center" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">H (cm)</label>
                  <input type="number" step="1" min="1" value={height} onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm text-center" />
                </div>
              </div>
            </div>

            {/* === CARE INSTRUCTIONS === */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Care Instructions</label>
              <div className="space-y-1.5">
                {careInstructions.map((instruction, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text" value={instruction}
                      onChange={(e) => updateCareInstruction(i, e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm"
                      placeholder="Care instruction"
                    />
                    <button type="button" onClick={() => removeCareInstruction(i)} className="px-1.5 text-gray-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addCareInstruction} className="text-xs text-coral hover:underline">
                  + Add instruction
                </button>
              </div>
            </div>

            {/* === TOGGLES === */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="rounded border-gray-300 text-coral focus:ring-coral" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Featured</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isBestSeller} onChange={(e) => setIsBestSeller(e.target.checked)} className="rounded border-gray-300 text-coral focus:ring-coral" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Best Seller</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300 text-coral focus:ring-coral" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Active</span>
              </label>
            </div>
          </div>

          {/* === FOOTER === */}
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
            <button
              type="submit" disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-coral hover:bg-coral/90 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : product ? "Update Product" : "Create Product"}
            </button>
            <button
              type="button" onClick={onCancel}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
