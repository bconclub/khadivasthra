"use client";

import { useState, useRef, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getAllProducts, updateProduct, createProduct, deleteProduct, updateProductOrder, triggerSiteDeploy } from "@/lib/services/admin";
import { getCategories } from "@/lib/services/categories";
import type { ProductWithCategory } from "@/types";
import { Plus, Search, Pencil, Trash2, Loader2, Eye, EyeOff, Star, RefreshCw, ArrowUp, ArrowDown, CheckSquare, Package, X, AlertTriangle, PackageX, Check } from "lucide-react";

const LOW_STOCK_THRESHOLD = 10;
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

type VisibilityFilter = "all" | "visible" | "hidden" | "low-stock" | "sold-out";

// Inline stock editing component
function StockBadge({
  product,
  isEditing,
  editValue,
  savingId,
  onStartEdit,
  onChange,
  onSave,
  onCancel,
}: {
  product: ProductWithCategory;
  isEditing: boolean;
  editValue: string;
  savingId: string | null;
  onStartEdit: (product: ProductWithCategory) => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const stock = product.stock_quantity || 0;
  const badgeClass = stock > 10
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : stock > 0
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';

  const isSaving = savingId === product.id;

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          min="0"
          step="1"
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onCancel();
          }}
          disabled={isSaving}
          className="w-[68px] px-2 py-1 text-sm font-bold text-center rounded-lg border-2 border-coral focus:outline-none focus:ring-2 focus:ring-coral/50 disabled:opacity-50 dark:bg-gray-800 dark:text-white"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSave}
          disabled={isSaving}
          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/30 dark:text-green-400"
          title="Save stock"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCancel}
          disabled={isSaving}
          className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/30"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => onStartEdit(product)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all hover:ring-2 hover:ring-coral/30 ${badgeClass}`}
      title="Click to edit stock"
    >
      <Pencil className="w-3 h-3 opacity-60" />
      {stock > 0 ? stock : 'Out'}
    </button>
  );
}

// Bulk stock update modal
function BulkStockModal({
  count,
  onClose,
  onUpdate,
}: {
  count: number;
  onClose: () => void;
  onUpdate: (value: number) => void;
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) {
      toast.error("Please enter a valid non-negative number");
      return;
    }
    setSubmitting(true);
    await onUpdate(numValue);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Bulk Stock Update</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Set stock quantity for <span className="font-bold text-coral">{count}</span> selected products
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              New Stock Quantity
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-lg font-bold text-center"
              placeholder="Enter quantity"
              autoFocus
            />
          </div>
        </div>
        <div className="flex gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSubmit}
            disabled={submitting || !value}
            className="flex-1 px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : "Update Stock"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const { data: products, loading, refetch } = useSupabaseQuery(getAllProducts);
  const { data: categories } = useSupabaseQuery(getCategories);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | undefined>();
  const [syncing, setSyncing] = useState(false);

  // Inline stock editing state
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Bulk selection state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await triggerSiteDeploy();
      toast.success("Site rebuild triggered! Changes will be live in ~2 minutes.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to trigger deploy");
    } finally {
      setSyncing(false);
    }
  };

  const allProducts = products || [];

  const isSoldOut = (p: ProductWithCategory) => (p.stock_quantity || 0) === 0 || !p.in_stock;
  const isLowStock = (p: ProductWithCategory) => {
    const qty = p.stock_quantity || 0;
    return qty > 0 && qty <= LOW_STOCK_THRESHOLD && p.in_stock;
  };

  const visibleCount = allProducts.filter((p) => p.is_active).length;
  const hiddenCount = allProducts.filter((p) => !p.is_active).length;
  const lowStockCount = allProducts.filter(isLowStock).length;
  const soldOutCount = allProducts.filter(isSoldOut).length;

  const filtered = allProducts.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category_id === categoryFilter;
    const matchesVisibility =
      visibilityFilter === "all" ||
      (visibilityFilter === "visible" && p.is_active) ||
      (visibilityFilter === "hidden" && !p.is_active) ||
      (visibilityFilter === "low-stock" && isLowStock(p)) ||
      (visibilityFilter === "sold-out" && isSoldOut(p));
    return matchesSearch && matchesCategory && matchesVisibility;
  });

  const selectedCount = selectedProducts.size;

  const handleCreate = async (data: Record<string, unknown>) => {
    await createProduct(data as Parameters<typeof createProduct>[0]);
    toast.success("Product created");
    setShowForm(false);
    refetch();
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingProduct) return;
    await updateProduct(editingProduct.id, data as Parameters<typeof updateProduct>[1]);
    toast.success("Product updated");
    setEditingProduct(undefined);
    setShowForm(false);
    refetch();
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProduct(undefined);
  };

  const handleDelete = async (product: ProductWithCategory) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(product.id);
      toast.success("Product deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const toggleActive = async (product: ProductWithCategory) => {
    try {
      const newState = !product.is_active;
      await updateProduct(product.id, { is_active: newState });
      toast.success(newState ? `"${product.name}" is now visible` : `"${product.name}" is now hidden`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const toggleFeatured = async (product: ProductWithCategory) => {
    try {
      const newState = !product.is_featured;
      await updateProduct(product.id, { is_featured: newState });
      toast.success(newState ? `"${product.name}" marked as featured` : `"${product.name}" removed from featured`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const moveProduct = async (productId: string, direction: "up" | "down") => {
    const list = filtered;
    const idx = list.findIndex((p) => p.id === productId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;

    // If all display_orders are the same (e.g. all 0), assign positions from current index first
    const allSame = list.every((p) => (p.display_order ?? 0) === (list[0].display_order ?? 0));
    const getOrder = (i: number) => allSame ? i : (list[i].display_order ?? i);

    const currentOrder = getOrder(idx);
    const swapOrder = getOrder(swapIdx);

    try {
      const updates: { id: string; display_order: number }[] = allSame
        // Re-index everyone so we have a stable base, then swap the two
        ? list.map((p, i) => ({ id: p.id, display_order: i === idx ? swapIdx : i === swapIdx ? idx : i }))
        : [
            { id: list[idx].id, display_order: swapOrder },
            { id: list[swapIdx].id, display_order: currentOrder },
          ];
      await updateProductOrder(updates);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
    }
  };

  const openEdit = (product: ProductWithCategory) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingProduct(undefined);
    setShowForm(true);
  };

  // Inline stock editing handlers
  const startStockEdit = (product: ProductWithCategory) => {
    setEditingStockId(product.id);
    setEditValue((product.stock_quantity || 0).toString());
  };

  const cancelStockEdit = () => {
    setEditingStockId(null);
    setEditValue("");
  };

  const saveStockEdit = async () => {
    if (!editingStockId) return;

    const newValue = parseInt(editValue, 10);
    if (isNaN(newValue) || newValue < 0) {
      toast.error("Please enter a valid non-negative number");
      return;
    }

    // Find the product
    const product = products?.find(p => p.id === editingStockId);
    if (!product) return;

    const oldValue = product.stock_quantity || 0;
    if (newValue === oldValue) {
      cancelStockEdit();
      return;
    }

    setSavingId(editingStockId);

    try {
      await updateProduct(editingStockId, {
        stock_quantity: newValue,
        in_stock: newValue > 0,
      });
      toast.success(`Stock updated to ${newValue}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update stock");
    } finally {
      setSavingId(null);
      setEditingStockId(null);
      setEditValue("");
    }
  };

  // Bulk selection handlers
  const toggleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allSelected = filtered.length > 0 && filtered.every(p => selectedProducts.has(p.id));
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (allSelected) {
        filtered.forEach(p => next.delete(p.id));
      } else {
        filtered.forEach(p => next.add(p.id));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  // Bulk stock update handler
  const handleBulkStockUpdate = async (newValue: number) => {
    const ids = Array.from(selectedProducts);
    if (ids.length === 0) return;

    try {
      // Update all selected products
      const promises = ids.map(id => updateProduct(id, { stock_quantity: newValue }));
      await Promise.all(promises);
      toast.success(`Stock updated to ${newValue} for ${ids.length} products`);
      await refetch();
      setShowBulkModal(false);
      clearSelection();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update stock");
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{allProducts.length} total products</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={handleSync}
              disabled={syncing}
              className="!bg-gray-800 hover:!bg-gray-900"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Publish Site'}
            </Button>
            <Button variant="primary" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <ProductForm
            product={editingProduct}
            onSubmit={editingProduct ? handleUpdate : handleCreate}
            onCancel={closeForm}
          />
        )}

        {/* Bulk Stock Update Modal */}
        {showBulkModal && (
          <BulkStockModal
            count={selectedCount}
            onClose={() => setShowBulkModal(false)}
            onUpdate={handleBulkStockUpdate}
          />
        )}

        {/* Visibility Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setVisibilityFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              visibilityFilter === "all"
                ? "bg-coral text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            All ({allProducts.length})
          </button>
          <button
            onClick={() => setVisibilityFilter("visible")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
              visibilityFilter === "visible"
                ? "bg-coral text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Visible ({visibleCount})
          </button>
          <button
            onClick={() => setVisibilityFilter("hidden")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
              visibilityFilter === "hidden"
                ? "bg-coral text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" /> Hidden ({hiddenCount})
          </button>
          <button
            onClick={() => setVisibilityFilter("low-stock")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
              visibilityFilter === "low-stock"
                ? "bg-amber-500 text-white"
                : "bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            }`}
            title={`Stock between 1 and ${LOW_STOCK_THRESHOLD}`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock ({lowStockCount})
          </button>
          <button
            onClick={() => setVisibilityFilter("sold-out")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
              visibilityFilter === "sold-out"
                ? "bg-red-500 text-white"
                : "bg-white dark:bg-gray-800 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20"
            }`}
            title="Stock is 0 or marked out of stock"
          >
            <PackageX className="w-3.5 h-3.5" /> Sold Out ({soldOutCount})
          </button>
        </div>

        {/* Search & Category Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Bulk Actions Bar */}
        {selectedCount > 0 && (
          <div className="flex items-center justify-between bg-coral/10 dark:bg-coral/20 border border-coral/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-coral" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedCount} product{selectedCount > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Update Stock
              </Button>
              <button
                onClick={clearSelection}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Products Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-coral" />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && filtered.every(p => selectedProducts.has(p.id))}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-coral focus:ring-coral"
                      />
                    </th>
                    <th className="px-6 py-3">Order</th>
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3">Price</th>
                    <th className="px-6 py-3">Stock</th>
                    <th className="px-6 py-3">Visible</th>
                    <th className="px-6 py-3">Featured</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                        No products found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((product) => (
                      <tr key={product.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!product.is_active ? 'bg-gray-50/50 dark:bg-gray-900/30' : ''}`}>
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => toggleSelectProduct(product.id)}
                            className="w-4 h-4 rounded border-gray-300 text-coral focus:ring-coral"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-0.5">
                            <button
                              onClick={() => moveProduct(product.id, "up")}
                              disabled={filtered.indexOf(product) === 0}
                              className="p-1 text-gray-400 hover:text-coral disabled:opacity-20 disabled:cursor-not-allowed rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveProduct(product.id, "down")}
                              disabled={filtered.indexOf(product) === filtered.length - 1}
                              className="p-1 text-gray-400 hover:text-coral disabled:opacity-20 disabled:cursor-not-allowed rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
                                <span className="text-gray-400 dark:text-gray-500 text-xs">No img</span>
                              </div>
                            )}
                            {!product.is_active && (
                              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" title="Hidden" />
                            )}
                            <div>
                              <p className={`font-medium line-clamp-1 ${product.is_active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{product.name}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{product.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          ₹{Number(product.price).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <StockBadge
                            product={product}
                            isEditing={editingStockId === product.id}
                            editValue={editValue}
                            savingId={savingId}
                            onStartEdit={startStockEdit}
                            onChange={setEditValue}
                            onSave={saveStockEdit}
                            onCancel={cancelStockEdit}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleActive(product)}
                            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2"
                            style={{ backgroundColor: product.is_active ? '#22c55e' : '#d1d5db' }}
                            title={product.is_active ? "Click to hide" : "Click to show"}
                            role="switch"
                            aria-checked={product.is_active}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                product.is_active ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleFeatured(product)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                              product.is_featured
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500 dark:hover:bg-gray-600"
                            }`}
                            title={product.is_featured ? "Remove from featured" : "Mark as featured"}
                          >
                            <Star className={`w-3.5 h-3.5 ${product.is_featured ? 'fill-amber-500 dark:fill-amber-400' : ''}`} />
                            {product.is_featured ? "Featured" : "Not featured"}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/product/${product.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="View on storefront"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => openEdit(product)}
                              className="p-2 text-gray-400 hover:text-coral rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Edit product"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
