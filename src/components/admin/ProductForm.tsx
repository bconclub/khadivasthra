"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "./ImageUpload";
import { uploadProductImage } from "@/lib/services/storage";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getCategories } from "@/lib/services/categories";
import type { Product } from "@/types";
import { Loader2, X } from "lucide-react";

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
  const [price, setPrice] = useState(product?.price?.toString() || "");
  const [comparePrice, setComparePrice] = useState(product?.compare_price?.toString() || "");
  const [categoryId, setCategoryId] = useState(product?.category_id || "");
  const [material, setMaterial] = useState(product?.material || "");
  const [imageUrl, setImageUrl] = useState(product?.image_url || "");
  const [isFeatured, setIsFeatured] = useState(product?.is_featured || false);
  const [isBestSeller, setIsBestSeller] = useState(product?.is_best_seller || false);
  const [isActive, setIsActive] = useState(product?.is_active !== false);
  const [inStock, setInStock] = useState(product?.in_stock !== false);
  const [careInstructions, setCareInstructions] = useState<string[]>(
    product?.care_instructions || ["Hand wash cold", "Dry in shade"]
  );

  const handleNameChange = (value: string) => {
    setName(value);
    if (!product) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !price || !categoryId) {
      setError("Name, price, and category are required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name,
        slug,
        description,
        long_description: longDescription,
        price: parseFloat(price),
        compare_price: comparePrice ? parseFloat(comparePrice) : null,
        category_id: categoryId,
        material,
        image_url: imageUrl,
        is_featured: isFeatured,
        is_best_seller: isBestSeller,
        is_active: isActive,
        in_stock: inStock,
        care_instructions: careInstructions.filter(Boolean),
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

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
          <input
            type="number"
            required
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Compare Price (₹)</label>
          <input
            type="number"
            step="0.01"
            value={comparePrice}
            onChange={(e) => setComparePrice(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>
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

      <ImageUpload
        currentUrl={imageUrl}
        onUpload={async (file) => {
          const url = await uploadProductImage(file, slug || slugify(name));
          setImageUrl(url);
          return url;
        }}
        onRemove={() => setImageUrl("")}
      />

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
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="rounded border-gray-300 text-coral focus:ring-coral" />
          <span className="text-sm text-gray-700">In Stock</span>
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
