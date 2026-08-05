"use client";

import { useState } from "react";
import Image from "next/image";
import { AdminShell } from "@/components/admin/AdminShell";
import { BannerForm } from "@/components/admin/BannerForm";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getBanners, createBanner, updateBanner, deleteBanner } from "@/lib/services/admin";
import type { Banner } from "@/types";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const PLACEMENT_LABELS: Record<string, string> = {
  hero_background: "Hero Background",
  homepage_hero: "Homepage Hero",
  heritage: "Heritage Photo",
  shop: "Shop Page",
  offers: "Offers Page",
  general: "Homepage Cards",
};

export default function AdminBannersPage() {
  const { data: banners, loading, refetch } = useSupabaseQuery(getBanners);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | undefined>();

  const allBanners = banners || [];

  const handleCreate = async (data: Record<string, unknown>) => {
    await createBanner(data as Parameters<typeof createBanner>[0]);
    toast.success("Banner created");
    setShowForm(false);
    refetch();
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingBanner) return;
    await updateBanner(editingBanner.id, data as Parameters<typeof updateBanner>[1]);
    toast.success("Banner updated");
    setEditingBanner(undefined);
    setShowForm(false);
    refetch();
  };

  const handleDelete = async (banner: Banner) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await deleteBanner(banner.id);
      toast.success("Banner deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await updateBanner(banner.id, { is_active: !banner.is_active });
      toast.success(banner.is_active ? "Banner hidden" : "Banner activated");
      refetch();
    } catch (err) {
      toast.error("Toggle failed");
    }
  };

  const openEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingBanner(undefined);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingBanner(undefined);
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Banners & Offers</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {allBanners.length} banner{allBanners.length !== 1 ? "s" : ""} &middot;{" "}
              {allBanners.filter((b) => b.is_active).length} active
            </p>
          </div>
          <Button variant="primary" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Banner
          </Button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8 px-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-lg w-full shadow-xl">
              <BannerForm
                banner={editingBanner}
                onSubmit={editingBanner ? handleUpdate : handleCreate}
                onCancel={closeForm}
              />
            </div>
          </div>
        )}

        {/* Banner Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-coral" />
          </div>
        ) : allBanners.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-coral" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No banners yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create banners to promote offers and products across your store.
            </p>
            <Button variant="primary" onClick={openCreate}>
              Create First Banner
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {allBanners.map((banner) => (
              <div
                key={banner.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden transition-all ${
                  banner.is_active
                    ? "border-gray-200 dark:border-gray-700"
                    : "border-gray-200 dark:border-gray-700 opacity-60"
                }`}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Banner Image Preview */}
                  <div className="sm:w-64 h-32 sm:h-auto flex-shrink-0 relative bg-gray-100 dark:bg-gray-700">
                    <Image
                      src={banner.image_url}
                      alt="Banner"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {banner.mobile_image_url && (
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                        + mobile
                      </span>
                    )}
                  </div>

                  {/* Banner Info */}
                  <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {PLACEMENT_LABELS[banner.placement] || banner.placement}
                        </h3>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                          banner.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {banner.is_active ? "Live" : "Hidden"}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggleActive(banner)}
                        className="p-2 text-gray-400 hover:text-coral rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title={banner.is_active ? "Hide banner" : "Show banner"}
                      >
                        {banner.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEdit(banner)}
                        className="p-2 text-gray-400 hover:text-coral rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(banner)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
