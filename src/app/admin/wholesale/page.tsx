"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import {
  listAccounts,
  listEnquiries,
  setAccountActive,
  updateEnquiry,
} from "@/lib/services/wholesale";
import type { WholesaleAccount, WholesaleEnquiry, WholesaleEnquiryStatus } from "@/types";
import { Loader2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";

const STATUSES: WholesaleEnquiryStatus[] = ["new", "contacted", "quoted", "won", "lost"];

const STATUS_STYLE: Record<WholesaleEnquiryStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  quoted: "bg-purple-100 text-purple-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-gray-200 text-gray-600",
};

const money = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

export default function AdminWholesalePage() {
  const [tab, setTab] = useState<"accounts" | "enquiries">("accounts");

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wholesale</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Approve trade buyers and work through their enquiries.
          </p>
        </div>

        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {(["accounts", "enquiries"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-coral text-coral"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "accounts" ? <AccountsTab /> : <EnquiriesTab />}
      </div>
    </AdminShell>
  );
}

function AccountsTab() {
  const { data: accounts, loading, refetch } = useSupabaseQuery(listAccounts);
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (account: WholesaleAccount) => {
    setBusy(account.id);
    try {
      await setAccountActive(account.id, !account.is_active);
      toast.success(account.is_active ? "Account suspended" : "Account approved");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the account");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Spinner />;
  const list = accounts || [];
  if (list.length === 0) return <Empty text="No trade buyers have registered yet." />;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900/40 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Business</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">GST</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {list.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.account_code || "-"}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900 dark:text-white">{a.business_name || "-"}</div>
                <div className="text-xs text-gray-400">
                  {[a.city, a.state, a.pincode].filter(Boolean).join(", ") || "No address"}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-gray-700 dark:text-gray-300">{a.contact_name || "-"}</div>
                <div className="text-xs text-gray-400">{a.phone || a.email || ""}</div>
              </td>
              <td className="px-4 py-3 text-gray-500">{a.gst_number || "-"}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    a.is_active ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {a.is_active ? "Approved" : "Awaiting approval"}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => toggle(a)}
                  disabled={busy === a.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60 ${
                    a.is_active
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-coral text-white hover:bg-coral/90"
                  }`}
                >
                  {busy === a.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : a.is_active ? (
                    <X className="w-3.5 h-3.5" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {a.is_active ? "Suspend" : "Approve"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EnquiriesTab() {
  const { data: enquiries, loading, refetch } = useSupabaseQuery(listEnquiries);
  const [openId, setOpenId] = useState<string | null>(null);

  const setStatus = async (enquiry: WholesaleEnquiry, status: WholesaleEnquiryStatus) => {
    try {
      await updateEnquiry(enquiry.id, { status });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the enquiry");
    }
  };

  if (loading) return <Spinner />;
  const list = enquiries || [];
  if (list.length === 0) return <Empty text="No enquiries yet." />;

  return (
    <div className="space-y-3">
      {list.map((e) => (
        <div
          key={e.id}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <button
            onClick={() => setOpenId(openId === e.id ? null : e.id)}
            className="w-full flex items-center gap-4 px-4 py-3 text-left"
          >
            <span className="font-mono text-xs text-gray-500 w-20 flex-shrink-0">
              {e.enquiry_number || "-"}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-medium text-gray-900 dark:text-white truncate">
                {e.account?.business_name || "Unknown business"}
              </span>
              <span className="block text-xs text-gray-400">
                {e.item_count} pieces · {new Date(e.created_at).toLocaleDateString("en-IN")}
              </span>
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {money(e.estimated_total)}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[e.status]}`}>
              {e.status}
            </span>
            {openId === e.id ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {openId === e.id && (
            <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Buyer</p>
                  <p className="text-gray-700 dark:text-gray-300">{e.account?.contact_name || "-"}</p>
                  <p className="text-gray-500">{e.account?.phone || e.account?.email || ""}</p>
                  <p className="text-gray-500">
                    {[e.account?.address, e.account?.city, e.account?.state, e.account?.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {e.account?.gst_number && (
                    <p className="text-gray-500">GST {e.account.gst_number}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(e, s)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          e.status === s
                            ? STATUS_STYLE[s]
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {e.notes && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-xs uppercase tracking-wide text-gray-400 block mb-1">
                        Buyer note
                      </span>
                      {e.notes}
                    </p>
                  )}
                </div>
              </div>

              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="py-2">Product</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {e.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2 text-gray-700 dark:text-gray-300">{item.product_name}</td>
                      <td className="py-2 text-right text-gray-500">{money(item.wholesale_price)}</td>
                      <td className="py-2 text-right text-gray-500">{item.quantity}</td>
                      <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                        {money(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-coral" />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <p className="text-gray-500 dark:text-gray-400">{text}</p>
    </div>
  );
}
