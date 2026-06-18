"use client";

import { useState } from "react";
import { InvestorShell } from "@/components/investor/InvestorShell";
import { useInvestorAuth } from "@/context/InvestorAuthContext";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import {
  getDashboard,
  getSalesTrend,
  getMySettlements,
  getMyNotifications,
  getMyDocuments,
  getMyDocumentUrl,
  markNotificationRead,
} from "@/lib/services/investor-portal";
import { exportCsv, exportPdf } from "@/lib/reports";
import type { DesignPerformance, SalesTrendPoint, Settlement, InvestorNotification, InvestorDocument } from "@/types";
import {
  Loader2, TrendingUp, Wallet, IndianRupee, ChevronDown, ChevronUp,
  FileText, Bell, Download, BarChart3,
} from "lucide-react";

const inr = (n: number) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const DOC_LABELS: Record<string, string> = {
  agreement: "Investment Agreement",
  settlement_statement: "Settlement Statement",
  sales_report: "Sales Report",
  tax_gst: "Tax / GST Document",
  other: "Document",
};

export default function InvestorDashboardPage() {
  return (
    <InvestorShell>
      <DashboardContent />
    </InvestorShell>
  );
}

function DashboardContent() {
  const { investor } = useInvestorAuth();
  const { data: designs, loading, error } = useSupabaseQuery<DesignPerformance[]>(() => getDashboard(), []);
  const { data: settlements } = useSupabaseQuery<Settlement[]>(() => getMySettlements(), []);
  const { data: notifications, refetch: refetchNotifs } = useSupabaseQuery<InvestorNotification[]>(() => getMyNotifications(), []);
  const { data: documents } = useSupabaseQuery<InvestorDocument[]>(() => getMyDocuments(), []);

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-coral" /></div>;
  }
  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>;
  }

  const rows = designs ?? [];
  const totals = rows.reduce(
    (a, d) => ({
      invested: a.invested + Number(d.amount_invested),
      sales: a.sales + Number(d.sales_value),
      earnings: a.earnings + Number(d.earnings),
      paid: a.paid + Number(d.settled_amount),
      pending: a.pending + Number(d.pending_amount),
    }),
    { invested: 0, sales: 0, earnings: 0, paid: 0, pending: 0 }
  );

  return (
    <div className="space-y-8">
      {/* Investor details */}
      <section>
        <h1 className="text-2xl font-bold text-gray-800">Welcome, {investor?.full_name}</h1>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
          <span>ID: <span className="font-medium text-gray-700">{investor?.investor_code}</span></span>
          {investor?.mobile && <span>Mobile: <span className="font-medium text-gray-700">{investor.mobile}</span></span>}
          {investor?.email && <span>Email: <span className="font-medium text-gray-700">{investor.email}</span></span>}
          <span>Designs: <span className="font-medium text-gray-700">{rows.length}</span></span>
        </div>
      </section>

      {/* Summary metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard icon={<Wallet className="w-4 h-4" />} label="Total Investment" value={inr(totals.invested)} />
        <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Total Sales" value={inr(totals.sales)} />
        <MetricCard icon={<IndianRupee className="w-4 h-4" />} label="Total Earnings" value={inr(totals.earnings)} accent />
        <MetricCard icon={<IndianRupee className="w-4 h-4" />} label="Amount Paid" value={inr(totals.paid)} />
        <MetricCard icon={<IndianRupee className="w-4 h-4" />} label="Amount Pending" value={inr(totals.pending)} />
      </section>

      {/* Notifications */}
      {notifications && notifications.filter((n) => !n.is_read).length > 0 && (
        <section className="space-y-2">
          {notifications.filter((n) => !n.is_read).map((n) => (
            <div key={n.id} className="bg-orange/10 border border-orange/30 rounded-lg p-3 flex items-start gap-3">
              <Bell className="w-4 h-4 text-orange mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">{n.title}</div>
                <div className="text-sm text-gray-600">{n.body}</div>
              </div>
              <button
                onClick={async () => { await markNotificationRead(n.id); refetchNotifs(); }}
                className="text-xs text-coral hover:underline flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Per-design performance */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Your Designs</h2>
          {rows.length > 0 && (
            <button
              onClick={() => exportCsv(rows as unknown as Record<string, string | number>[], "investor_statement.csv")}
              className="text-sm text-coral hover:underline flex items-center gap-1"
            >
              <Download className="w-4 h-4" /> Investor Statement
            </button>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="text-gray-500 text-sm">No investments yet.</p>
        ) : (
          rows.map((d) => <DesignCard key={d.investment_id} d={d} />)
        )}
      </section>

      {/* Settlements */}
      <SettlementsSection settlements={settlements ?? []} />

      {/* Documents */}
      <DocumentsSection documents={documents ?? []} />
    </div>
  );
}

function MetricCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "bg-coral/5 border-coral/20" : "bg-white border-gray-200"}`}>
      <div className="flex items-center gap-2 text-gray-400 text-xs">{icon}<span>{label}</span></div>
      <div className={`mt-1 text-xl font-bold ${accent ? "text-coral" : "text-gray-800"}`}>{value}</div>
    </div>
  );
}

function DesignCard({ d }: { d: DesignPerformance }) {
  const [open, setOpen] = useState(false);
  const [trend, setTrend] = useState<SalesTrendPoint[] | null>(null);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [granularity, setGranularity] = useState<"day" | "month">("day");

  const loadTrend = async (g: "day" | "month") => {
    setLoadingTrend(true);
    try {
      setTrend(await getSalesTrend(d.product_id, g));
    } finally {
      setLoadingTrend(false);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !trend) loadTrend(granularity);
  };

  const maxUnits = Math.max(1, ...(trend ?? []).map((t) => Number(t.units)));

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 flex gap-4">
        {/* Photos */}
        <div className="flex gap-2 flex-shrink-0">
          {d.product_image && (
            <img src={d.product_image} alt={d.product_name} className="w-20 h-24 object-cover rounded-lg border border-gray-100" />
          )}
          {d.design_preview && (
            <img src={d.design_preview} alt={d.design_name ?? ""} className="w-20 h-24 object-cover rounded-lg border border-gray-100 hidden sm:block" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-gray-800">{d.design_name || d.product_name}</div>
              <div className="text-xs text-gray-400">
                {d.design_code && <>#{d.design_code} · </>}
                {d.product_name}
                {d.category_name && <> · {d.category_name}</>}
                {d.product_type && <> · {d.product_type === "double_mundu" ? "Double Mundu" : "Single Mundu"}</>}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              {d.status}
            </span>
          </div>

          {/* Sales progress */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{d.units_sold} / {d.units_allocated} units sold</span>
              <span>{Number(d.progress_pct)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-coral rounded-full" style={{ width: `${Math.min(100, Number(d.progress_pct))}%` }} />
            </div>
          </div>

          {/* Stat grid */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
            <Stat label="Invested" value={inr(d.amount_invested)} />
            <Stat label="Manufactured" value={`${d.manufactured_quantity}`} />
            <Stat label="Remaining Stock" value={`${d.remaining_stock}`} />
            <Stat label="Sales Value" value={inr(d.sales_value)} />
            <Stat label="Earnings" value={inr(d.earnings)} accent />
            <Stat label="Settled" value={inr(d.settled_amount)} />
            <Stat label="Pending" value={inr(d.pending_amount)} />
            <Stat label="Next Settlement" value={d.next_settlement_date ?? "—"} />
          </div>
        </div>
      </div>

      <button onClick={toggle} className="w-full border-t border-gray-100 py-2 text-sm text-coral hover:bg-coral/5 flex items-center justify-center gap-1">
        <BarChart3 className="w-4 h-4" /> Sales tracking {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 text-xs">
              {(["day", "month"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => { setGranularity(g); loadTrend(g); }}
                  className={`px-2 py-1 rounded ${granularity === g ? "bg-coral text-white" : "bg-white border border-gray-200 text-gray-600"}`}
                >
                  {g === "day" ? "Daily" : "Monthly"}
                </button>
              ))}
            </div>
            {trend && trend.length > 0 && (
              <div className="flex gap-3 text-xs">
                <button onClick={() => exportCsv(trend as unknown as Record<string, string | number>[], `${d.design_code || d.product_name}_sales.csv`)} className="text-coral hover:underline">CSV</button>
                <button onClick={() => exportPdf({ title: `${granularity === "day" ? "Daily" : "Monthly"} Sales — ${d.design_name || d.product_name}`, subtitle: d.design_code ?? undefined, rows: trend as unknown as Record<string, string | number>[] })} className="text-coral hover:underline">PDF</button>
              </div>
            )}
          </div>

          {loadingTrend ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-coral" /></div>
          ) : !trend || trend.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No sales recorded yet.</p>
          ) : (
            <div className="space-y-1">
              {trend.map((t) => (
                <div key={t.period} className="flex items-center gap-2 text-xs">
                  <span className="w-24 text-gray-500 flex-shrink-0">{t.period}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                    <div className="h-full bg-coral/70 rounded" style={{ width: `${(Number(t.units) / maxUnits) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right text-gray-600">{t.units}u</span>
                  <span className="w-20 text-right text-gray-500">{inr(t.sales_value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`font-medium ${accent ? "text-coral" : "text-gray-800"}`}>{value}</div>
    </div>
  );
}

function SettlementsSection({ settlements }: { settlements: Settlement[] }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Wallet className="w-5 h-5 text-coral" /> Settlement History</h2>
        {settlements.length > 0 && (
          <button
            onClick={() => exportCsv(settlements.map((s) => ({
              date: s.settlement_date, period_start: s.period_start ?? "", period_end: s.period_end ?? "",
              units: s.units_settled, amount: s.amount, status: s.status,
            })), "settlement_report.csv")}
            className="text-sm text-coral hover:underline flex items-center gap-1"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        )}
      </div>
      {settlements.length === 0 ? (
        <p className="text-gray-500 text-sm">No settlements yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Period</th>
                <th className="text-right px-4 py-2">Units</th>
                <th className="text-right px-4 py-2">Amount</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{s.settlement_date}</td>
                  <td className="px-4 py-2 text-gray-500">{s.period_start && s.period_end ? `${s.period_start} → ${s.period_end}` : "—"}</td>
                  <td className="px-4 py-2 text-right">{s.units_settled}</td>
                  <td className="px-4 py-2 text-right font-medium">{inr(s.amount)}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DocumentsSection({ documents }: { documents: InvestorDocument[] }) {
  const open = async (path: string) => {
    try {
      const url = await getMyDocumentUrl(path);
      window.open(url, "_blank");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to open document");
    }
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3"><FileText className="w-5 h-5 text-coral" /> Documents</h2>
      {documents.length === 0 ? (
        <p className="text-gray-500 text-sm">No documents available.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => open(doc.file_path)}
              className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3 hover:border-coral/40 text-left"
            >
              <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{doc.title || DOC_LABELS[doc.doc_type]}</div>
                <div className="text-xs text-gray-400">{DOC_LABELS[doc.doc_type]}</div>
              </div>
              <Download className="w-4 h-4 text-coral flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
