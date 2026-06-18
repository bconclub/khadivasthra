"use client";

import { useState, useRef, useEffect } from "react";
import { uploadProductImage } from "@/lib/services/storage";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getCategories } from "@/lib/services/categories";
import type { ProductWithCategory, ProductColor, ProductVariant } from "@/types";
import { Loader2, X, Plus, Camera, Package, Trash2, RefreshCw, Palette, GripVertical } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ProductFormProps {
  product?: ProductWithCategory;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function generateSKU(productSlug: string, colorName: string, size: string): string {
  const colorCode = colorName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
  const sizeCode = size.toUpperCase();
  return `KV-${productSlug.slice(0, 6).toUpperCase()}-${colorCode}-${sizeCode}`;
}

interface ColorFormData {
  id?: string;
  name: string;
  hex_code: string;
  images: string[];
  sort_order: number;
  sizes: SizeVariantFormData[];
}

interface SizeVariantFormData {
  id?: string;
  size: string;
  sku: string;
  stock_quantity: number;
  price_adjustment: number;
  is_active: boolean;
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
  const [hasVariants, setHasVariants] = useState(product?.has_variants || false);
  const [careInstructions, setCareInstructions] = useState<string[]>(
    product?.care_instructions || ["Hand wash cold", "Dry in shade"]
  );
  const [weight, setWeight] = useState(product?.weight?.toString() || "0.2");
  const [length, setLength] = useState(product?.length?.toString() || "13");
  const [breadth, setBreadth] = useState(product?.breadth?.toString() || "7");
  const [height, setHeight] = useState(product?.height?.toString() || "3");
  const [stockQuantity, setStockQuantity] = useState(product?.stock_quantity?.toString() || "0");
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const mainInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Investable design fields
  const [isInvestable, setIsInvestable] = useState(product?.is_investable || false);
  const [designName, setDesignName] = useState(product?.design_name || "");
  const [designCode, setDesignCode] = useState(product?.design_code || "");
  const [designPreviewUrl, setDesignPreviewUrl] = useState(product?.design_preview_url || "");
  const [productType, setProductType] = useState(product?.product_type || "");
  const [manufacturedQuantity, setManufacturedQuantity] = useState(product?.manufactured_quantity?.toString() || "0");
  const [unitCost, setUnitCost] = useState(product?.unit_cost?.toString() || "");
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const previewInputRef = useRef<HTMLInputElement>(null);

  const handlePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;
    setUploadingPreview(true);
    try {
      const url = await uploadProductImage(file, `${slug || slugify(name)}-design`);
      setDesignPreviewUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingPreview(false);
      if (previewInputRef.current) previewInputRef.current.value = "";
    }
  };

  // Colors and variants state
  const existingColors: ColorFormData[] = (product?.colors || []).map((c, idx) => ({
    id: c.id,
    name: c.name,
    hex_code: c.hex_code,
    images: c.images || [],
    sort_order: c.sort_order || idx,
    sizes: (product?.variants || [])
      .filter(v => v.color_id === c.id)
      .map(v => ({
        id: v.id,
        size: v.size,
        sku: v.sku,
        stock_quantity: v.stock_quantity,
        price_adjustment: v.price_adjustment,
        is_active: v.is_active,
      })),
  }));
  const [colors, setColors] = useState<ColorFormData[]>(existingColors);
  const [showColorModal, setShowColorModal] = useState(false);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const [colorForm, setColorForm] = useState({ name: "", hex_code: "#000000", images: [] as string[] });
  const [uploadingColorImage, setUploadingColorImage] = useState(false);
  const colorImageInputRef = useRef<HTMLInputElement>(null);

  const mrpNum = parseFloat(comparePrice) || 0;
  const calculatedSalePrice = discountPct > 0 && mrpNum > 0
    ? Math.round(mrpNum * (1 - discountPct / 100))
    : mrpNum;
  const hasDiscount = discountPct > 0 && mrpNum > 0;

  // Variations (colors + sizes) are available for ALL products. Originally gated
  // to shirts-only — gate removed so mundus, sarees, etc. can also have color
  // and design variations with per-variant images and stock.
  const selectedCategory = categories?.find(c => c.id === categoryId);
  const isShirtsCategory = selectedCategory?.slug === 'shirts';

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

  // Color management
  const openColorModal = (colorIndex: number | null = null) => {
    if (colorIndex !== null) {
      const color = colors[colorIndex];
      setColorForm({ name: color.name, hex_code: color.hex_code, images: color.images });
      setEditingColorIndex(colorIndex);
    } else {
      setColorForm({ name: "", hex_code: "#000000", images: [] });
      setEditingColorIndex(null);
    }
    setShowColorModal(true);
    setError("");
  };

  const closeColorModal = () => {
    setShowColorModal(false);
    setColorForm({ name: "", hex_code: "#000000", images: [] });
    setEditingColorIndex(null);
  };

  const saveColor = () => {
    if (!colorForm.name.trim()) {
      setError("Color name is required");
      return;
    }
    if (colorForm.images.length === 0) {
      setError("At least one image is required for the color");
      return;
    }
    
    // Check for duplicate color names
    const duplicateIndex = colors.findIndex((c, idx) => 
      c.name.toLowerCase() === colorForm.name.trim().toLowerCase() && idx !== editingColorIndex
    );
    if (duplicateIndex !== -1) {
      setError(`Color "${colorForm.name}" already exists`);
      return;
    }

    if (editingColorIndex !== null) {
      // Update existing
      setColors(colors.map((c, idx) => idx === editingColorIndex ? { 
        ...c, 
        name: colorForm.name.trim(), 
        hex_code: colorForm.hex_code,
        images: colorForm.images 
      } : c));
    } else {
      // Add new
      setColors([...colors, {
        name: colorForm.name.trim(),
        hex_code: colorForm.hex_code,
        images: colorForm.images,
        sort_order: colors.length,
        sizes: [],
      }]);
    }
    closeColorModal();
  };

  const deleteColor = (index: number) => {
    if (!confirm(`Delete color "${colors[index].name}"? All size variants for this color will also be deleted.`)) return;
    setColors(colors.filter((_, i) => i !== index));
  };

  const handleColorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingColorImage(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) continue;
        const url = await uploadProductImage(file, `${slug || slugify(name)}-color`);
        newUrls.push(url);
      }
      setColorForm({ ...colorForm, images: [...colorForm.images, ...newUrls].slice(0, 4) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingColorImage(false);
      if (colorImageInputRef.current) colorImageInputRef.current.value = "";
    }
  };

  const removeColorImage = (index: number) => {
    setColorForm({ ...colorForm, images: colorForm.images.filter((_, i) => i !== index) });
  };

  // Size variant management
  const addSizeToColor = (colorIndex: number) => {
    const size = prompt("Enter size (e.g., M, L, XL, Free Size):");
    if (!size || !size.trim()) return;
    
    const trimmedSize = size.trim().toUpperCase();
    const color = colors[colorIndex];
    
    // Check for duplicate size
    if (color.sizes.some(s => s.size === trimmedSize)) {
      setError(`Size ${trimmedSize} already exists for ${color.name}`);
      return;
    }

    const newSize: SizeVariantFormData = {
      size: trimmedSize,
      sku: generateSKU(slug || slugify(name), color.name, trimmedSize),
      stock_quantity: 10,
      price_adjustment: 0,
      is_active: true,
    };

    setColors(colors.map((c, idx) => idx === colorIndex ? { ...c, sizes: [...c.sizes, newSize] } : c));
    setError("");
  };

  const updateSizeVariant = (colorIndex: number, sizeIndex: number, updates: Partial<SizeVariantFormData>) => {
    setColors(colors.map((c, ci) => {
      if (ci !== colorIndex) return c;
      return {
        ...c,
        sizes: c.sizes.map((s, si) => si === sizeIndex ? { ...s, ...updates } : s),
      };
    }));
  };

  const removeSizeVariant = (colorIndex: number, sizeIndex: number) => {
    setColors(colors.map((c, idx) => idx === colorIndex ? { ...c, sizes: c.sizes.filter((_, i) => i !== sizeIndex) } : c));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !mrpNum || !categoryId) {
      setError("Name, MRP, and category are required.");
      return;
    }
    
    // Validate stock quantity for non-variant products
    if (!hasVariants) {
      const stockNum = parseInt(stockQuantity, 10);
      if (isNaN(stockNum) || stockNum < 0) {
        setError("Stock quantity must be a non-negative number");
        return;
      }
    }

    // Validate variants if has_variants is true
    if (hasVariants) {
      if (colors.length === 0) {
        setError("Add at least one color or disable variants");
        return;
      }
      for (const color of colors) {
        if (color.sizes.length === 0) {
          setError(`Add at least one size for color "${color.name}"`);
          return;
        }
      }
      const totalStock = colors.reduce((sum, c) => sum + c.sizes.reduce((s, sz) => s + sz.stock_quantity, 0), 0);
      if (totalStock === 0) {
        setError("At least one variant must have stock > 0");
        return;
      }
    }
    
    setSubmitting(true);
    try {
      const totalStock = hasVariants
        ? colors.reduce((sum, c) => sum + c.sizes.reduce((s, sz) => s + sz.stock_quantity, 0), 0)
        : parseInt(stockQuantity, 10) || 0;

      const baseData = {
        name, slug, description,
        long_description: longDescription,
        price: calculatedSalePrice,
        compare_price: hasDiscount ? mrpNum : null,
        category_id: categoryId, material,
        image_url: imageUrl, images: galleryImages,
        is_featured: isFeatured, is_best_seller: isBestSeller, is_active: isActive,
        has_variants: hasVariants,
        stock_quantity: totalStock,
        in_stock: totalStock > 0,
        care_instructions: careInstructions.filter(Boolean),
        display_order: product?.display_order ?? 0,
        colours: hasVariants ? colors.map(c => c.name) : [],
        sizes: hasVariants ? [...new Set(colors.flatMap(c => c.sizes.map(s => s.size)))] : [],
        weight: parseFloat(weight) || 0.2,
        length: parseFloat(length) || 13,
        breadth: parseFloat(breadth) || 7,
        height: parseFloat(height) || 3,
        // Investable design fields
        is_investable: isInvestable,
        design_name: isInvestable ? (designName || null) : null,
        design_code: isInvestable ? (designCode || null) : null,
        design_preview_url: isInvestable ? (designPreviewUrl || null) : null,
        product_type: isInvestable && productType ? productType : null,
        manufactured_quantity: isInvestable ? (parseInt(manufacturedQuantity, 10) || 0) : 0,
        unit_cost: isInvestable && unitCost ? parseFloat(unitCost) : null,
      };

      // Prepare colors and variants for submission
      const colorsData = colors.map((c, idx) => ({
        ...(c.id ? { id: c.id } : {}),
        name: c.name,
        hex_code: c.hex_code,
        images: c.images,
        sort_order: idx,
      }));

      const variantsData = colors.flatMap(c => 
        c.sizes.map(s => ({
          ...(s.id ? { id: s.id } : {}),
          color_id: c.id, // Will be replaced by server if new color
          color_name: c.name, // Include color name to help backend resolve new colors
          size: s.size,
          sku: s.sku,
          stock_quantity: s.stock_quantity,
          price_adjustment: s.price_adjustment,
          is_active: s.is_active,
        }))
      );

      await onSubmit({ ...baseData, colors: colorsData, variants: variantsData });
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

  const predefinedColors = [
    { name: "White", hex: "#FFFFFF" },
    { name: "Off-White", hex: "#FAF9F6" },
    { name: "Cream", hex: "#FFFDD0" },
    { name: "Ivory", hex: "#FFFFF0" },
    { name: "Gold", hex: "#FFD700" },
    { name: "Silver", hex: "#C0C0C0" },
    { name: "Yellow", hex: "#FFFF00" },
    { name: "Light Yellow", hex: "#FFFFE0" },
    { name: "Saffron", hex: "#F4C430" },
    { name: "Orange", hex: "#FFA500" },
    { name: "Pink", hex: "#FFC0CB" },
    { name: "Rose", hex: "#FF007F" },
    { name: "Red", hex: "#FF0000" },
    { name: "Maroon", hex: "#800000" },
    { name: "Purple", hex: "#800080" },
    { name: "Violet", hex: "#EE82EE" },
    { name: "Blue", hex: "#0000FF" },
    { name: "Navy Blue", hex: "#000080" },
    { name: "Sky Blue", hex: "#87CEEB" },
    { name: "Green", hex: "#008000" },
    { name: "Light Green", hex: "#90EE90" },
    { name: "Olive", hex: "#808000" },
    { name: "Brown", hex: "#A52A2A" },
    { name: "Beige", hex: "#F5F5DC" },
    { name: "Grey", hex: "#808080" },
    { name: "Black", hex: "#000000" },
    { name: "Kasavu Gold", hex: "#D4AF37" },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-4 px-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl shadow-2xl my-auto">
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
            {/* === HAS VARIANTS TOGGLE (available for all categories) === */}
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={(e) => setHasVariants(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-coral focus:ring-coral"
                id="has-variants"
              />
              <label htmlFor="has-variants" className="flex-1 cursor-pointer">
                <span className="font-semibold text-gray-900 dark:text-white block">This product has variations</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isShirtsCategory
                    ? "Enable to manage different colors with dedicated images and size variants"
                    : "Enable to manage colors / designs with their own images and stock. Use \"One Size\" if size doesn't apply."}
                </span>
              </label>
            </div>

            {/* === INVESTABLE DESIGN === */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isInvestable}
                  onChange={(e) => setIsInvestable(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-coral focus:ring-coral"
                  id="is-investable"
                />
                <label htmlFor="is-investable" className="flex-1 cursor-pointer">
                  <span className="font-semibold text-gray-900 dark:text-white block">Investable design</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Investors can be allocated units of this design and track its performance.
                  </span>
                </label>
              </div>

              {isInvestable && (
                <div className="space-y-3 pt-2 border-t border-amber-200 dark:border-amber-800">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Design Name</label>
                      <input
                        type="text" value={designName}
                        onChange={(e) => setDesignName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm"
                        placeholder="Kasavu Classic"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Design ID</label>
                      <input
                        type="text" value={designCode}
                        onChange={(e) => setDesignCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm font-mono"
                        placeholder="DSN-001"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Product Type</label>
                      <select
                        value={productType}
                        onChange={(e) => setProductType(e.target.value as typeof productType)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm"
                      >
                        <option value="">Select</option>
                        <option value="single_mundu">Single Mundu</option>
                        <option value="double_mundu">Double Mundu</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Units Manufactured</label>
                      <input
                        type="number" min="0" value={manufacturedQuantity}
                        onChange={(e) => setManufacturedQuantity(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-start">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Unit Cost (₹)</label>
                      <input
                        type="number" min="0" step="0.01" value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Design Photo</label>
                      {designPreviewUrl ? (
                        <div className="relative w-20 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
                          <Image src={designPreviewUrl} alt="Design" fill className="object-cover" unoptimized />
                          <button
                            type="button"
                            onClick={() => { setDesignPreviewUrl(""); if (previewInputRef.current) previewInputRef.current.value = ""; }}
                            className="absolute top-0.5 right-0.5 bg-white/90 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => previewInputRef.current?.click()}
                          disabled={uploadingPreview}
                          className="w-20 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-coral/50 flex flex-col items-center justify-center bg-white dark:bg-gray-800"
                        >
                          {uploadingPreview ? <Loader2 className="w-5 h-5 animate-spin text-coral" /> : <Camera className="w-5 h-5 text-gray-400" />}
                        </button>
                      )}
                      <input ref={previewInputRef} type="file" accept="image/*" onChange={handlePreviewUpload} className="hidden" />
                    </div>
                  </div>
                </div>
              )}
            </div>

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

            {/* Category + Material */}
            <div className="grid grid-cols-2 gap-3">
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
            </div>

            {/* === PRICING & STOCK === */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Pricing</label>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Base MRP (₹) *</label>
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

              {/* Stock Quantity (for non-variant products) */}
              {!hasVariants && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Stock</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      className="w-24 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm font-bold"
                    />
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      parseInt(stockQuantity, 10) > 10
                        ? 'bg-green-100 text-green-700'
                        : parseInt(stockQuantity, 10) > 0
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {parseInt(stockQuantity, 10) > 10 ? 'In Stock' : parseInt(stockQuantity, 10) > 0 ? 'Low Stock' : 'Out of Stock'}
                    </span>
                  </div>
                </div>
              )}

              {hasVariants && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Variant prices can be adjusted from the base price (+/-) per size.
                </p>
              )}
            </div>

            {/* === COLOR VARIATIONS SECTION === */}
            {hasVariants && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Color Variations</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => openColorModal()}
                    className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add New Color
                  </button>
                </div>

                {/* Color cards */}
                {colors.length > 0 ? (
                  <div className="space-y-3">
                    {colors.map((color, colorIndex) => (
                      <div 
                        key={color.id || colorIndex}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                      >
                        {/* Color header */}
                        <div className="flex items-start gap-3 mb-4">
                          <div 
                            className="w-12 h-12 rounded-full border-2 border-gray-200 flex-shrink-0"
                            style={{ backgroundColor: color.hex_code }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white">{color.name}</h4>
                              <button
                                type="button"
                                onClick={() => openColorModal(colorIndex)}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteColor(colorIndex)}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                            <p className="text-xs text-gray-500">{color.images.length} images</p>
                          </div>
                          {/* Image thumbnails */}
                          <div className="flex gap-1">
                            {color.images.slice(0, 3).map((img, idx) => (
                              <div key={idx} className="relative w-10 h-10 rounded border border-gray-200 overflow-hidden">
                                <Image src={img} alt="" fill className="object-cover" unoptimized />
                              </div>
                            ))}
                            {color.images.length > 3 && (
                              <div className="w-10 h-10 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-500">
                                +{color.images.length - 3}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Sizes */}
                        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-500">Sizes</span>
                            <button
                              type="button"
                              onClick={() => addSizeToColor(colorIndex)}
                              className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <Plus className="w-3 h-3 inline mr-1" /> Add Size
                            </button>
                          </div>
                          {color.sizes.length > 0 ? (
                            <div className="space-y-2">
                              {color.sizes.map((size, sizeIndex) => (
                                <div key={sizeIndex} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                  <span className="font-medium text-sm w-12">{size.size}</span>
                                  <div className="flex-1 grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-[10px] text-gray-400 block">Stock</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={size.stock_quantity}
                                        onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, { stock_quantity: parseInt(e.target.value) || 0 })}
                                        className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-400 block">Price +/-</label>
                                      <input
                                        type="number"
                                        value={size.price_adjustment}
                                        onChange={(e) => updateSizeVariant(colorIndex, sizeIndex, { price_adjustment: parseInt(e.target.value) || 0 })}
                                        className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-400 block">Final</label>
                                      <span className="text-sm font-semibold">₹{calculatedSalePrice + size.price_adjustment}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeSizeVariant(colorIndex, sizeIndex)}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No sizes added yet</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <Palette className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No colors yet. Click "Add New Color" to get started.</p>
                  </div>
                )}
              </div>
            )}

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

        {/* Color Modal */}
        {showColorModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {editingColorIndex !== null ? "Edit Color" : "Add New Color"}
                </h3>
                <button onClick={closeColorModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm p-2 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Color name */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Color Name</label>
                  <select
                    value={colorForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const predefined = predefinedColors.find(c => c.name === name);
                      setColorForm({ 
                        ...colorForm, 
                        name,
                        hex_code: predefined ? predefined.hex : colorForm.hex_code 
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm mb-2"
                  >
                    <option value="">Select or type custom</option>
                    {predefinedColors.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={colorForm.name}
                    onChange={(e) => setColorForm({ ...colorForm, name: e.target.value })}
                    placeholder="Or enter custom color name"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm"
                  />
                </div>

                {/* Hex picker */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Color Code</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={colorForm.hex_code}
                      onChange={(e) => setColorForm({ ...colorForm, hex_code: e.target.value })}
                      className="w-12 h-12 rounded border-0 p-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={colorForm.hex_code}
                      onChange={(e) => setColorForm({ ...colorForm, hex_code: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm font-mono uppercase"
                    />
                  </div>
                </div>

                {/* Images */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Images (max 4) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorForm.images.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                        <Image src={url} alt="" fill className="object-cover" unoptimized />
                        <button
                          type="button"
                          onClick={() => removeColorImage(idx)}
                          className="absolute top-0.5 right-0.5 bg-white/90 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                    {colorForm.images.length < 4 && (
                      <button
                        type="button"
                        onClick={() => colorImageInputRef.current?.click()}
                        disabled={uploadingColorImage}
                        className="w-16 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-coral/50 flex flex-col items-center justify-center"
                      >
                        {uploadingColorImage ? (
                          <Loader2 className="w-4 h-4 animate-spin text-coral" />
                        ) : (
                          <Plus className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>
                  <input 
                    ref={colorImageInputRef}
                    type="file" 
                    accept="image/*" 
                    multiple
                    onChange={handleColorImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={saveColor}
                  className="flex-1 px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral/90 transition-colors"
                >
                  {editingColorIndex !== null ? "Save Changes" : "Add Color"}
                </button>
                <button
                  type="button"
                  onClick={closeColorModal}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
