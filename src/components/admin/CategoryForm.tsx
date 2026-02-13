"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "./ImageUpload";
import { uploadCategoryImage } from "@/lib/services/storage";
import type { Category } from "@/types";
import { Loader2, X } from "lucide-react";

interface CategoryFormProps {
  category?: Category;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CategoryForm({ category, onSubmit, onCancel }: CategoryFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(category?.name || "");
  const [slug, setSlug] = useState(category?.slug || "");
  const [description, setDescription] = useState(category?.description || "");
  const [imageUrl, setImageUrl] = useState(category?.image_url || "");
  const [displayOrder, setDisplayOrder] = useState(category?.display_order?.toString() || "0");
  const [isActive, setIsActive] = useState(category?.is_active !== false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!category) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name) {
      setError("Category name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name,
        slug,
        description,
        image_url: imageUrl,
        display_order: parseInt(displayOrder) || 0,
        is_active: isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {category ? "Edit Category" : "Add Category"}
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

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
        <input
          type="number"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(e.target.value)}
          className="w-32 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
        />
      </div>

      <ImageUpload
        currentUrl={imageUrl}
        onUpload={async (file) => {
          const url = await uploadCategoryImage(file, slug || slugify(name));
          setImageUrl(url);
          return url;
        }}
        onRemove={() => setImageUrl("")}
        label="Category Image"
      />

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300 text-coral focus:ring-coral" />
        <span className="text-sm text-gray-700">Active</span>
      </label>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button type="submit" variant="primary" disabled={submitting} className="flex-1">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : category ? "Update Category" : "Create Category"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
