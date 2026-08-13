"use client";

import { useState } from "react";
import Image from "next/image";
import { AdminShell } from "@/components/admin/AdminShell";
import { LookForm } from "@/components/admin/LookForm";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import {
  getAllLooks,
  createLook,
  updateLook,
  deleteLook,
  getLookProducts,
} from "@/lib/services/looks";
import { storageImage, IMG } from "@/lib/image";
import type { Look, LookFormData } from "@/types";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function AdminLooksPage() {
  const { data: looks, loading, refetch } = useSupabaseQuery(getAllLooks);
  const [showForm, setShowForm] = useState(false);
  const [editingLook, setEditingLook] = useState<Look | undefined>();
  const [editingProductIds, setEditingProductIds] = useState<string[]>([]);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const allLooks = looks || [];

  const handleCreate = async (data: Record<string, unknown>, productIds: string[]) => {
    await createLook(data as LookFormData, productIds);
    toast.success("Look created");
    setShowForm(false);
    refetch();
  };

  const handleUpdate = async (data: Record<string, unknown>, productIds: string[]) => {
    if (!editingLook) return;
    await updateLook(editingLook.id, data as Partial<LookFormData>, productIds);
    toast.success("Look updated");
    setEditingLook(undefined);
    setShowForm(false);
    refetch();
  };

  const handleDelete = async (look: Look) => {
    if (!confirm(`Delete the look "${look.name}"? The products themselves are not affected.`)) return;
    try {
      await deleteLook(look.id);
      toast.success("Look deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const toggle = async (look: Look, field: "is_active" | "is_featured") => {
    try {
      await updateLook(look.id, { [field]: !look[field] });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const openEdit = async (look: Look) => {
    setLoadingEdit(true);
    try {
      const products = await getLookProducts(look.id);
      setEditingProductIds(products.map((p) => p.id));
      setEditingLook(look);
      setShowForm(true);
    } catch {
      toast.error("Could not load this look's products");
    } finally {
      setLoadingEdit(false);
    }
  };

  const openCreate = () => {
    setEditingLook(undefined);
    setEditingProductIds([]);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingLook(undefined);
    setEditingProductIds([]);
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shop the Look</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {allLooks.length} look{allLooks.length !== 1 ? "s" : ""} &middot;{" "}
              {allLooks.filter((l) => l.is_featured).length} on the homepage
            </p>
          </div>
          <Button variant="primary" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Look
          </Button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8 px-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-2xl w-full shadow-xl">
              <LookForm
                look={editingLook}
                initialProductIds={editingProductIds}
                onSubmit={editingLook ? handleUpdate : handleCreate}
                onCancel={closeForm}
              />
            </div>
          </div>
        )}

        {loading || loadingEdit ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-coral" />
          </div>
        ) : allLooks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-coral" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No looks yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              A look is a styled photo plus the products in it — the mundu, the shirt, the pair,
              accessories.
            </p>
            <Button variant="primary" onClick={openCreate}>
              Create First Look
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allLooks.map((look) => (
              <div
                key={look.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${
                  look.is_active ? "" : "opacity-60"
                }`}
              >
                <div className="relative aspect-[4/5] bg-gray-100 dark:bg-gray-700">
                  <Image
                    src={storageImage(look.image_url, IMG.card)}
                    alt={look.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    {look.is_featured && (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" /> Homepage
                      </span>
                    )}
                    <span className="bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                      {look.product_count ?? 0} products
                    </span>
                  </div>
                </div>

                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate flex-1">
                      {look.name}
                    </h3>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                        look.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {look.is_active ? "Live" : "Hidden"}
                    </span>
                  </div>
                  <a
                    href={`/looks/${look.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-coral hover:underline inline-flex items-center gap-1 font-mono"
                  >
                    <ExternalLink className="w-3 h-3" /> /looks/{look.slug}
                  </a>

                  <div className="flex items-center gap-1 mt-3 border-t border-gray-100 dark:border-gray-700 pt-2">
                    <button
                      onClick={() => toggle(look, "is_featured")}
                      title={look.is_featured ? "Remove from homepage" : "Show on homepage"}
                      className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        look.is_featured ? "text-amber-500" : "text-gray-400 hover:text-amber-500"
                      }`}
                    >
                      <Star className={`w-4 h-4 ${look.is_featured ? "fill-amber-500" : ""}`} />
                    </button>
                    <button
                      onClick={() => toggle(look, "is_active")}
                      title={look.is_active ? "Hide look" : "Show look"}
                      className="p-2 text-gray-400 hover:text-coral rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {look.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(look)}
                      className="p-2 text-gray-400 hover:text-coral rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(look)}
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
