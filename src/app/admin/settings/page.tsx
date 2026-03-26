"use client";

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getSettings, updateSettings } from "@/lib/services/settings";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import type { SiteSettings } from "@/types";

const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const cardClass = "bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4";
const cardTitleClass = "font-semibold text-gray-900 dark:text-white";

export default function AdminSettingsPage() {
  const { data: settings, loading } = useSupabaseQuery(getSettings);
  const [saving, setSaving] = useState(false);

  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [shippingInfo, setShippingInfo] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [codEnabled, setCodEnabled] = useState(true);

  useEffect(() => {
    if (settings) {
      setWhatsappNumber(settings.whatsapp_number || "");
      setStoreName(settings.store_name || "");
      setStoreEmail(settings.store_email || "");
      setStorePhone(settings.store_phone || "");
      setStoreAddress(settings.store_address || "");
      setShippingInfo(settings.shipping_info || "");
      setReturnPolicy(settings.return_policy || "");
      setAnnouncement(settings.announcement_text || "");
      setCodEnabled(settings.cod_enabled ?? true);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        whatsapp_number: whatsappNumber,
        store_name: storeName,
        store_email: storeEmail,
        store_phone: storePhone,
        store_address: storeAddress,
        shipping_info: shippingInfo,
        return_policy: returnPolicy,
        announcement_text: announcement,
        cod_enabled: codEnabled,
      } as Partial<SiteSettings>);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminShell>
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-coral" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Configure your store details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Options */}
          <div className={cardClass}>
            <h2 className={cardTitleClass}>Payment Options</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cash on Delivery (COD)</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Allow customers to pay cash when the order is delivered</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={codEnabled}
                onClick={() => setCodEnabled(!codEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 ${
                  codEnabled ? "bg-coral" : "bg-gray-200 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    codEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Store Information */}
          <div className={cardClass}>
            <h2 className={cardTitleClass}>Store Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Store Name</label>
                <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Store Phone</label>
                <input type="text" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Store Email</label>
              <input type="email" value={storeEmail} onChange={(e) => setStoreEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Store Address</label>
              <textarea rows={2} value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} className={`${inputClass} resize-none`} />
            </div>
          </div>

          {/* WhatsApp */}
          <div className={cardClass}>
            <h2 className={cardTitleClass}>WhatsApp</h2>
            <div>
              <label className={labelClass}>WhatsApp Number</label>
              <input
                type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)}
                className={inputClass} placeholder="918714090510"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Include country code without + (e.g., 918714090510)</p>
            </div>
          </div>

          {/* Policies */}
          <div className={cardClass}>
            <h2 className={cardTitleClass}>Policies & Info</h2>
            <div>
              <label className={labelClass}>Shipping Information</label>
              <textarea rows={3} value={shippingInfo} onChange={(e) => setShippingInfo(e.target.value)} className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className={labelClass}>Return Policy</label>
              <textarea rows={3} value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)} className={`${inputClass} resize-none`} />
            </div>
          </div>

          {/* Announcement */}
          <div className={cardClass}>
            <h2 className={cardTitleClass}>Announcement Banner</h2>
            <div>
              <label className={labelClass}>Announcement Text</label>
              <input
                type="text" value={announcement} onChange={(e) => setAnnouncement(e.target.value)}
                className={inputClass} placeholder="Leave empty to hide banner"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={saving}>
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Settings</>
            )}
          </Button>
        </form>
      </div>
    </AdminShell>
  );
}
