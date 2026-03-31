"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getAllProducts, updateProduct, createProduct, deleteProduct, updateProductOrder, triggerSiteDeploy } from "@/lib/services/admin";
import { getCategories } from "@/lib/services/categories";
import type { ProductWithCategory } from "@/types";
import { Plus, Search, Pencil, Trash2, Loader2, Eye, EyeOff, Star, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

type VisibilityFilter = "all" | "visible" | "hidden";

export default function AdminProductsPage() {
  const { data: products, loading, refetch } = useSupabaseQuery(getAllProducts);
  const { data: categories } = useSupabaseQuery(getCategories);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | undefined>();
  const [syncing, setSyncing] = useState(false);

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

  const visibleCount = allProducts.filter((p) => p.is_active).length;
  const hiddenCount = allProducts.filter((p) => !p.is_active).length;

  const filtered = allProducts.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category_id === categoryFilter;
    const matchesVisibility =
      visibilityFilter === "all" ||
      (visibilityFilter === "visible" && p.is_active) ||
      (visibilityFilter === "hidden" && !p.is_active);
    return matchesSearch && matchesCategory && matchesVisibility;
  });

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
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                        No products found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((product) => (
                      <tr key={product.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!product.is_active ? 'bg-gray-50/50 dark:bg-gray-900/30' : ''}`}>
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
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            (product.stock_quantity || 0) > 10
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : (product.stock_quantity || 0) > 0
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {(product.stock_quantity || 0) > 0 ? product.stock_quantity : 'Out'}
                          </span>
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
