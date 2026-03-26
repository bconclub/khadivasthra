"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getCategories } from "@/lib/services/categories";
import { createCategory, updateCategory, deleteCategory } from "@/lib/services/admin";
import type { Category } from "@/types";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
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
