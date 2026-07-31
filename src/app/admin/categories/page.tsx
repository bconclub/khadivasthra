"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getCategories } from "@/lib/services/categories";
import { createCategory, updateCategory, deleteCategory, applyCategoryOffer } from "@/lib/services/admin";
import type { Category } from "@/types";
import { Plus, Pencil, Trash2, Loader2, BadgePercent, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function AdminCategoriesPage() {
  const { data: categories, loading, refetch } = useSupabaseQuery(getCategories);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();

  const allCategories = categories || [];

  const handleCreate = async (data: Record<string, unknown>) => {
    await createCategory(data as Parameters<typeof createCategory>[0]);
    toast.success("Category created");
    setShowForm(false);
    refetch();
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingCategory) return;
    await updateCategory(editingCategory.id, data as Parameters<typeof updateCategory>[1]);
    toast.success("Category updated");
    setEditingCategory(undefined);
    setShowForm(false);
    refetch();
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Delete "${category.name}"? Products in this category will be affected.`)) return;
    try {
      await deleteCategory(category.id);
      toast.success("Category deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingCategory(undefined);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCategory(undefined);
  };

  const [offerCategory, setOfferCategory] = useState<Category | undefined>();
  const [offerPct, setOfferPct] = useState("");
  const [applyingOffer, setApplyingOffer] = useState(false);

  const handleApplyOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerCategory) return;
    const pct = parseFloat(offerPct) || 0;
    if (pct < 0 || pct > 90) {
      toast.error("Discount must be between 0 and 90%");
      return;
    }
    setApplyingOffer(true);
    try {
      const count = await applyCategoryOffer(offerCategory.id, pct);
      toast.success(
        pct > 0
          ? `${pct}% offer applied to ${count} products in ${offerCategory.name}`
          : `Offer cleared on ${count} products in ${offerCategory.name}`
      );
      setOfferCategory(undefined);
      setOfferPct("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply offer");
    } finally {
      setApplyingOffer(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{allCategories.length} categories</p>
          </div>
          <Button variant="primary" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Category
          </Button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8 px-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-lg w-full shadow-xl">
              <CategoryForm
                category={editingCategory}
                onSubmit={editingCategory ? handleUpdate : handleCreate}
                onCancel={closeForm}
              />
            </div>
          </div>
        )}

        {/* Category Offer Modal */}
        {offerCategory && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto pt-24 px-4">
            <form onSubmit={handleApplyOffer} className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BadgePercent className="w-5 h-5 text-emerald-600" /> Category Offer
                </h2>
                <button type="button" onClick={() => setOfferCategory(undefined)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Applies to every product in <span className="font-semibold text-gray-700 dark:text-gray-200">{offerCategory.name}</span> in one go.
                Discount is calculated from each product&apos;s MRP. Enter 0 to remove the offer.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount %</label>
                <input
                  type="number" min={0} max={90} step={1} autoFocus required
                  value={offerPct}
                  onChange={(e) => setOfferPct(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => setOfferCategory(undefined)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={applyingOffer} className="flex-1">
                  {applyingOffer ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Apply Offer
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Categories Table */}
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
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Slug</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {allCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                        No categories yet
                      </td>
                    </tr>
                  ) : (
                    allCategories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {category.display_order}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900 dark:text-white">{category.name}</p>
                          {category.description && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 mt-1">{category.description}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-gray-400">
                          {category.slug}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            category.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                          }`}>
                            {category.is_active ? "Active" : "Hidden"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setOfferCategory(category); setOfferPct(""); }}
                              className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Set offer for all products in this category"
                            >
                              <BadgePercent className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEdit(category)}
                              className="p-2 text-gray-400 hover:text-coral rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(category)}
                              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
