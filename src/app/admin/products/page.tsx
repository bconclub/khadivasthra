"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/categories";
import { createProduct, updateProduct, deleteProduct } from "@/lib/services/admin";
import type { Product } from "@/types";
import { Plus, Search, Pencil, Trash2, Loader2, Eye, EyeOff, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function AdminProductsPage() {
  const { data: products, loading, refetch } = useSupabaseQuery(getProducts);
  const { data: categories } = useSupabaseQuery(getCategories);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();

  const allProducts = products || [];
  const filtered = allProducts.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
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

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(product.id);
      toast.success("Product deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      const newState = !product.is_active;
      await updateProduct(product.id, { is_active: newState });
      toast.success(newState ? `"${product.name}" is now visible` : `"${product.name}" is now hidden`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const toggleFeatured = async (product: Product) => {
    try {
      const newState = !product.is_featured;
      await updateProduct(product.id, { is_featured: newState });
      toast.success(newState ? `"${product.name}" marked as featured` : `"${product.name}" removed from featured`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingProduct(undefined);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProduct(undefined);
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-500 mt-1">{allProducts.length} total products</p>
          </div>
          <Button variant="primary" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8 px-4">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-xl">
              <ProductForm
                product={editingProduct}
                onSubmit={editingProduct ? handleUpdate : handleCreate}
                onCancel={closeForm}
              />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3">Price</th>
                    <th className="px-6 py-3">Visible</th>
                    <th className="px-6 py-3">Featured</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        No products found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((product) => (
                      <tr key={product.id} className={`hover:bg-gray-50 ${!product.is_active ? 'opacity-60' : ''}`}>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">{product.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{product.slug}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          ₹{Number(product.price).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleActive(product)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                              product.is_active
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                            title={product.is_active ? "Click to hide" : "Click to show"}
                          >
                            {product.is_active ? (
                              <><Eye className="w-3.5 h-3.5" /> Visible</>
                            ) : (
                              <><EyeOff className="w-3.5 h-3.5" /> Hidden</>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleFeatured(product)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                              product.is_featured
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            }`}
                            title={product.is_featured ? "Remove from featured" : "Mark as featured"}
                          >
                            <Star className={`w-3.5 h-3.5 ${product.is_featured ? 'fill-amber-500' : ''}`} />
                            {product.is_featured ? "Featured" : "Not featured"}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(product)}
                              className="p-2 text-gray-400 hover:text-coral rounded-lg hover:bg-gray-100 transition-colors"
                              title="Edit product"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors"
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
