"use client";

import { useState } from "react";
import Image from "next/image";
import { AdminShell } from "@/components/admin/AdminShell";
import { ComboForm } from "@/components/admin/ComboForm";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import {
  getAllCombos,
  createCombo,
  updateCombo,
  deleteCombo,
  getComboProducts,
} from "@/lib/services/combos";
import { storageImage, IMG } from "@/lib/image";
import type { Combo, ComboFormData } from "@/types";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Star, ExternalLink, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function AdminCombosPage() {
  const { data: combos, loading, refetch } = useSupabaseQuery(getAllCombos);
  const [showForm, setShowForm] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | undefined>();
  const [editingProductIds, setEditingProductIds] = useState<string[]>([]);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const allCombos = combos || [];

  const handleCreate = async (data: Record<string, unknown>, productIds: string[]) => {
    await createCombo(data as ComboFormData, productIds);
    toast.success("Combo created");
    setShowForm(false);
    refetch();
  };

  const handleUpdate = async (data: Record<string, unknown>, productIds: string[]) => {
    if (!editingCombo) return;
    await updateCombo(editingCombo.id, data as Partial<ComboFormData>, productIds);
    toast.success("Combo updated");
    setEditingCombo(undefined);
    setShowForm(false);
    refetch();
  };

  const handleDelete = async (combo: Combo) => {
    if (!confirm(`Delete the combo "${combo.name}"? The products themselves are not affected.`)) return;
    try {
      await deleteCombo(combo.id);
      toast.success("Combo deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const toggle = async (combo: Combo, field: "is_active" | "is_featured") => {
    try {
      await updateCombo(combo.id, { [field]: !combo[field] });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const openEdit = async (combo: Combo) => {
    setLoadingEdit(true);
    try {
      const products = await getComboProducts(combo.id);
      setEditingProductIds(products.map((p) => p.id));
      setEditingCombo(combo);
      setShowForm(true);
    } catch {
      toast.error("Could not load this combo's products");
    } finally {
      setLoadingEdit(false);
    }
  };

  const openCreate = () => {
    setEditingCombo(undefined);
    setEditingProductIds([]);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCombo(undefined);
    setEditingProductIds([]);
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Combos</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {allCombos.length} combo{allCombos.length !== 1 ? "s" : ""} &middot;{" "}
              {allCombos.filter((c) => c.is_featured).length} on the homepage
            </p>
          </div>
          <Button variant="primary" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Combo
          </Button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8 px-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-2xl w-full shadow-xl">
              <ComboForm
                combo={editingCombo}
                initialProductIds={editingProductIds}
                onSubmit={editingCombo ? handleUpdate : handleCreate}
                onCancel={closeForm}
              />
            </div>
          </div>
        )}

        {loading || loadingEdit ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-coral" />
          </div>
        ) : allCombos.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-coral" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No combos yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              A combo is one fixed price for a set the shopper builds themselves — any three mundus,
              for example.
            </p>
            <Button variant="primary" onClick={openCreate}>
              Create First Combo
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allCombos.map((combo) => (
              <div
                key={combo.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${
                  combo.is_active ? "" : "opacity-60"
                }`}
              >
                <div className="relative aspect-[4/5] bg-gray-100 dark:bg-gray-700">
                  {combo.image_url && (
                    <Image
                      src={storageImage(combo.image_url, IMG.card)}
                      alt={combo.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {combo.is_featured && (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" /> Homepage
                      </span>
                    )}
                    <span className="bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                      pick {combo.choose_count} of {combo.product_count ?? 0}
                    </span>
                  </div>
                  <span className="absolute bottom-2 left-2 bg-coral text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    ₹{Number(combo.combo_price).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate flex-1">
                      {combo.name}
                    </h3>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                        combo.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {combo.is_active ? "Live" : "Hidden"}
                    </span>
                  </div>
                  <a
                    href={`/combos/${combo.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-coral hover:underline inline-flex items-center gap-1 font-mono"
                  >
                    <ExternalLink className="w-3 h-3" /> /combos/{combo.slug}
                  </a>

                  <div className="flex items-center gap-1 mt-3 border-t border-gray-100 dark:border-gray-700 pt-2">
                    <button
                      onClick={() => toggle(combo, "is_featured")}
                      title={combo.is_featured ? "Remove from homepage" : "Show on homepage"}
                      className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        combo.is_featured ? "text-amber-500" : "text-gray-400 hover:text-amber-500"
                      }`}
                    >
                      <Star className={`w-4 h-4 ${combo.is_featured ? "fill-amber-500" : ""}`} />
                    </button>
                    <button
                      onClick={() => toggle(combo, "is_active")}
                      title={combo.is_active ? "Hide combo" : "Show combo"}
                      className="p-2 text-gray-400 hover:text-coral rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {combo.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(combo)}
                      className="p-2 text-gray-400 hover:text-coral rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(combo)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
