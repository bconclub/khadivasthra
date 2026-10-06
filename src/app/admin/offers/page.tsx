"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { SlideOver } from "@/components/admin/SlideOver";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  couponStats,
} from "@/lib/services/coupons";
import { referralLink } from "@/lib/referral";
import { Button } from "@/components/ui/button";
import type { Coupon, CouponFormData, CouponKind, CouponSource } from "@/types";
import { Plus, Pencil, Trash2, Loader2, Check, Eye, EyeOff, Link2, BadgePercent } from "lucide-react";
import toast from "react-hot-toast";

const money = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-coral focus:border-transparent";
const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

function describe(c: Coupon): string {
  return c.kind === "percent" ? `${Number(c.value)}% off` : `${money(Number(c.value))} off`;
}

function isLive(c: Coupon): boolean {
  const now = Date.now();
  if (!c.is_active) return false;
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return false;
  if (c.ends_at && new Date(c.ends_at).getTime() < now) return false;
  if (c.usage_limit != null && c.used_count >= c.usage_limit) return false;
  return true;
}

export default function AdminOffersPage() {
  const { data: coupons, loading, refetch } = useSupabaseQuery(listCoupons);
  const { data: stats, refetch: refetchStats } = useSupabaseQuery(couponStats);
  const [editing, setEditing] = useState<Coupon | null | "new">(null);
  const [copied, setCopied] = useState<string | null>(null);

  const all = coupons || [];
  const totals = Object.values(stats || {}).reduce(
    (acc, s) => ({ orders: acc.orders + s.orders, revenue: acc.revenue + s.revenue, discount: acc.discount + s.discount_given }),
    { orders: 0, revenue: 0, discount: 0 }
  );

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(referralLink(code, window.location.origin.includes("localhost") ? "https://khadivasthra.com" : window.location.origin));
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Could not copy. Select the link and copy it manually.");
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      await updateCoupon(c.id, { is_active: !c.is_active });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`Delete code ${c.code}? Orders already placed with it keep their attribution.`)) return;
    try {
      await deleteCoupon(c.id);
      toast.success("Code deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const save = async (data: CouponFormData) => {
    if (editing === "new") await createCoupon(data);
    else if (editing) await updateCoupon(editing.id, data);
    toast.success(editing === "new" ? "Code created" : "Code updated");
    setEditing(null);
    refetch();
    refetchStats();
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Offers & Referrals</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              One code per influencer. They share it, or the link, and every order that uses it is theirs.
            </p>
          </div>
          <Button variant="primary" onClick={() => setEditing("new")}>
            <Plus className="w-4 h-4 mr-2" /> New code
          </Button>
        </div>

        {/* Roll-up */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Orders via codes" value={String(totals.orders)} />
          <Stat label="Revenue attributed" value={money(totals.revenue)} />
          <Stat label="Discount given" value={money(totals.discount)} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-coral" />
          </div>
        ) : all.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <BadgePercent className="w-8 h-8 text-coral" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No codes yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create one per influencer. You get a code to share and a link that applies it on its own.
            </p>
            <Button variant="primary" onClick={() => setEditing("new")}>Create first code</Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Offer</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {all.map((c) => {
                  const s = stats?.[c.code];
                  const live = isLive(c);
                  return (
                    <tr key={c.id} className={c.is_active ? "" : "opacity-60"}>
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold text-gray-900 dark:text-white">{c.code}</div>
                        <button
                          onClick={() => copy(c.code)}
                          className="inline-flex items-center gap-1 text-[11px] text-coral hover:underline mt-0.5"
                          title={referralLink(c.code)}
                        >
                          {copied === c.code ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                          {copied === c.code ? "Link copied" : "Copy referral link"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 dark:text-white">{c.owner_name || "-"}</div>
                        <div className="text-xs text-gray-400">{c.owner_handle || c.source}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 dark:text-white">{describe(c)}</div>
                        <div className="text-xs text-gray-400">
                          {c.min_subtotal > 0 ? `min ${money(c.min_subtotal)}` : "no minimum"}
                          {c.max_discount != null ? ` · cap ${money(c.max_discount)}` : ""}
                          {c.usage_limit != null ? ` · ${c.used_count}/${c.usage_limit} uses` : ` · ${c.used_count} uses`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{s?.orders ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-medium text-gray-900 dark:text-white">{money(s?.revenue ?? 0)}</div>
                        <div className="text-xs text-gray-400">-{money(s?.discount_given ?? 0)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${live ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {live ? "Live" : c.is_active ? "Scheduled / exhausted" : "Off"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => toggleActive(c)} title={c.is_active ? "Switch off" : "Switch on"} className="p-2 text-gray-400 hover:text-coral rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                            {c.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setEditing(c)} className="p-2 text-gray-400 hover:text-coral rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => remove(c)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <SlideOver
          title={editing === "new" ? "New code" : `Edit ${editing.code}`}
          subtitle={editing === "new" ? "A code for one influencer or campaign" : editing.owner_name}
          onClose={() => setEditing(null)}
          width="md"
        >
          <CouponForm coupon={editing === "new" ? undefined : editing} onSubmit={save} onCancel={() => setEditing(null)} />
        </SlideOver>
      )}
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CouponForm({
  coupon,
  onSubmit,
  onCancel,
}: {
  coupon?: Coupon;
  onSubmit: (data: CouponFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(coupon?.code || "");
  const [ownerName, setOwnerName] = useState(coupon?.owner_name || "");
  const [ownerHandle, setOwnerHandle] = useState(coupon?.owner_handle || "");
  const [source, setSource] = useState<CouponSource>(coupon?.source || "influencer");
  const [kind, setKind] = useState<CouponKind>(coupon?.kind || "percent");
  const [value, setValue] = useState(coupon ? String(coupon.value) : "15");
  const [minSubtotal, setMinSubtotal] = useState(coupon ? String(coupon.min_subtotal) : "0");
  const [maxDiscount, setMaxDiscount] = useState(coupon?.max_discount != null ? String(coupon.max_discount) : "");
  const [startsAt, setStartsAt] = useState(toLocalInput(coupon?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(coupon?.ends_at ?? null));
  const [usageLimit, setUsageLimit] = useState(coupon?.usage_limit != null ? String(coupon.usage_limit) : "");
  const [isActive, setIsActive] = useState(coupon?.is_active ?? true);
  const [notes, setNotes] = useState(coupon?.notes || "");
  const [submitting, setSubmitting] = useState(false);

  const normalised = code.trim().toUpperCase().replace(/\s+/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalised) return;
    setSubmitting(true);
    try {
      await onSubmit({
        code: normalised,
        owner_name: ownerName.trim(),
        owner_handle: ownerHandle.trim() || null,
        source,
        kind,
        value: parseFloat(value) || 0,
        min_subtotal: parseFloat(minSubtotal) || 0,
        max_discount: maxDiscount.trim() ? parseFloat(maxDiscount) : null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        usage_limit: usageLimit.trim() ? parseInt(usageLimit, 10) : null,
        is_active: isActive,
        notes: notes.trim() || null,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <div>
        <label className={labelCls}>Code *</label>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PRIYA15" className={`${inputCls} font-mono uppercase`} required />
        {normalised && (
          <p className="text-[11px] text-gray-400 mt-1 break-all">
            Link: {referralLink(normalised)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Influencer / owner name *</label>
          <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Priya" className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Handle</label>
          <input value={ownerHandle} onChange={(e) => setOwnerHandle(e.target.value)} placeholder="@priya.styles" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Type</label>
        <select value={source} onChange={(e) => setSource(e.target.value as CouponSource)} className={inputCls}>
          <option value="influencer">Influencer</option>
          <option value="campaign">Campaign</option>
          <option value="partner">Partner</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="rounded-xl bg-coral/5 border border-coral/20 p-3 grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Discount</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as CouponKind)} className={inputCls}>
            <option value="percent">Percent off</option>
            <option value="flat">Flat ₹ off</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>{kind === "percent" ? "Percent" : "Amount (₹)"}</label>
          <input type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Minimum order (₹)</label>
          <input type="number" min="0" step="1" value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} className={inputCls} />
        </div>
        {kind === "percent" && (
          <div>
            <label className={labelCls}>Cap discount at (₹)</label>
            <input type="number" min="0" step="1" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} placeholder="No cap" className={inputCls} />
          </div>
        )}
        <p className="col-span-2 text-xs text-gray-500">Applies across the whole shop, on the product subtotal. Shipping is not discounted.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Starts</label>
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Ends</label>
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Usage limit</label>
          <input type="number" min="1" step="1" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="Unlimited" className={inputCls} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer self-end pb-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-coral focus:ring-coral" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
        </label>
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Deal terms, payout agreed, dates..." className={`${inputCls} resize-none`} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" variant="primary" disabled={!normalised || !ownerName.trim() || submitting} className="flex-1">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {coupon ? "Save" : "Create code"}
        </Button>
      </div>
    </form>
  );
}
