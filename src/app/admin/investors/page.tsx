"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import {
  Loader2, UserPlus, Trash2, KeyRound, X, ChevronDown, ChevronUp,
  Plus, FileText, Bell, IndianRupee, Briefcase,
} from "lucide-react";
import toast from "react-hot-toast";
import type {
  Investor, Investment, Settlement, InvestorDocument, ProductWithCategory, InvestorDocType,
} from "@/types";
import {
  listInvestors, createInvestor, updateInvestor, resetInvestorPassword, deleteInvestor,
  listInvestableDesigns, listInvestmentsForInvestor, createInvestment, updateInvestment, deleteInvestment,
  listSettlements, createSettlement, updateSettlement, deleteSettlement,
  listDocuments, uploadDocument, deleteDocument, getDocumentUrl, sendNotification,
} from "@/lib/services/investors";

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent text-sm";
const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";
const cardClass =
  "bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700";
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const DOC_TYPES: { value: InvestorDocType; label: string }[] = [
  { value: "agreement", label: "Investment Agreement" },
  { value: "settlement_statement", label: "Settlement Statement" },
  { value: "sales_report", label: "Sales Report" },
  { value: "tax_gst", label: "Tax / GST Document" },
  { value: "other", label: "Other" },
];

// ---- Add investor ----------------------------------------------------------
function CreateInvestorForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password || !fullName.trim()) {
      toast.error("Name, email and password are required");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await createInvestor({ email: email.trim(), password, full_name: fullName.trim(), mobile: mobile.trim() });
      toast.success("Investor created");
      setEmail(""); setFullName(""); setMobile(""); setPassword(""); setOpen(false);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create investor");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return <Button onClick={() => setOpen(true)} className="gap-2"><UserPlus className="w-4 h-4" /> Add investor</Button>;
  }

  return (
    <div className={`${cardClass} space-y-4`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-white">New investor</h2>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className={labelClass}>Full name *</label><input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div><label className={labelClass}>Mobile</label><input className={inputClass} value={mobile} onChange={(e) => setMobile(e.target.value)} /></div>
        <div><label className={labelClass}>Email *</label><input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="investor@example.com" /></div>
        <div><label className={labelClass}>Temporary password *</label><input className={inputClass} type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" /></div>
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Create</Button>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}

// ---- Settlements for one investment ---------------------------------------
function SettlementManager({ investment }: { investment: Investment }) {
  const [items, setItems] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [units, setUnits] = useState("");
  const [date, setDate] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [status, setStatus] = useState<"pending" | "paid">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listSettlements(investment.id)); }
    finally { setLoading(false); }
  }, [investment.id]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!amount || !date) { toast.error("Amount and date required"); return; }
    try {
      await createSettlement({
        investment_id: investment.id,
        amount: parseFloat(amount),
        units_settled: parseInt(units, 10) || 0,
        settlement_date: date,
        period_start: periodStart || null,
        period_end: periodEnd || null,
        next_due_date: nextDue || null,
        status,
      });
      toast.success("Settlement recorded");
      setAdding(false); setAmount(""); setUnits(""); setDate(""); setPeriodStart(""); setPeriodEnd(""); setNextDue("");
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const togglePaid = async (s: Settlement) => {
    await updateSettlement(s.id, { status: s.status === "paid" ? "pending" : "paid" });
    load();
  };
  const remove = async (s: Settlement) => {
    if (!window.confirm("Delete this settlement?")) return;
    await deleteSettlement(s.id); load();
  };

  return (
    <div className="mt-2 pl-3 border-l-2 border-gray-100 dark:border-gray-700 space-y-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin text-coral" /> : items.length === 0 ? (
        <p className="text-xs text-gray-400">No settlements.</p>
      ) : items.map((s) => (
        <div key={s.id} className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 w-24">{s.settlement_date}</span>
          <span className="font-medium w-20">{inr(s.amount)}</span>
          <span className="text-gray-400 w-14">{s.units_settled}u</span>
          <button onClick={() => togglePaid(s)} className={`px-2 py-0.5 rounded-full ${s.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{s.status}</button>
          <button onClick={() => remove(s)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
        </div>
      ))}

      {adding ? (
        <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3 grid grid-cols-2 gap-2">
          <div><label className={labelClass}>Amount *</label><input className={inputClass} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><label className={labelClass}>Units settled</label><input className={inputClass} type="number" value={units} onChange={(e) => setUnits(e.target.value)} /></div>
          <div><label className={labelClass}>Settlement date *</label><input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className={labelClass}>Next due date</label><input className={inputClass} type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} /></div>
          <div><label className={labelClass}>Period start</label><input className={inputClass} type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></div>
          <div><label className={labelClass}>Period end</label><input className={inputClass} type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></div>
          <div><label className={labelClass}>Status</label>
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as "pending" | "paid")}>
              <option value="pending">Pending</option><option value="paid">Paid</option>
            </select>
          </div>
          <div className="col-span-2 flex gap-2">
            <Button size="sm" onClick={save}>Save settlement</Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs text-coral hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Generate settlement</button>
      )}
    </div>
  );
}

// ---- Investments for one investor -----------------------------------------
function InvestmentsManager({ investor, designs }: { investor: Investor; designs: ProductWithCategory[] }) {
  const [items, setItems] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amount, setAmount] = useState("2250");
  const [units, setUnits] = useState("100");
  const [payout, setPayout] = useState("75");
  const [nextDate, setNextDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listInvestmentsForInvestor(investor.id)); }
    finally { setLoading(false); }
  }, [investor.id]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!productId || !startDate) { toast.error("Design and start date required"); return; }
    try {
      await createInvestment({
        investor_id: investor.id, product_id: productId,
        start_date: startDate, end_date: endDate || null,
        amount_invested: parseFloat(amount) || 0,
        units_allocated: parseInt(units, 10) || 0,
        per_unit_payout: parseFloat(payout) || 0,
        next_settlement_date: nextDate || null,
      });
      toast.success("Investment added");
      setAdding(false); setProductId(""); setStartDate(""); setEndDate(""); setNextDate("");
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const complete = async (inv: Investment) => {
    await updateInvestment(inv.id, { status: inv.status === "completed" ? "active" : "completed" });
    load();
  };
  const remove = async (inv: Investment) => {
    if (!window.confirm("Delete this investment and all its settlements?")) return;
    await deleteInvestment(inv.id); load();
  };

  return (
    <div className="space-y-3">
      {loading ? <Loader2 className="w-4 h-4 animate-spin text-coral" /> : items.length === 0 ? (
        <p className="text-xs text-gray-400">No investments yet.</p>
      ) : items.map((inv) => {
        const design = inv.product || designs.find((d) => d.id === inv.product_id);
        const isOpen = expanded === inv.id;
        return (
          <div key={inv.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm">
                <span className="font-medium text-gray-800 dark:text-gray-100">{design?.design_name || design?.name || "Design"}</span>
                <span className="text-gray-400 text-xs ml-2">{design?.design_code}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>{inv.status}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
              <span>Invested: <b className="text-gray-700 dark:text-gray-200">{inr(inv.amount_invested)}</b></span>
              <span>Units: <b className="text-gray-700 dark:text-gray-200">{inv.units_allocated}</b></span>
              <span>Payout/unit: <b className="text-gray-700 dark:text-gray-200">{inr(inv.per_unit_payout)}</b></span>
              <span>Next: <b className="text-gray-700 dark:text-gray-200">{inv.next_settlement_date ?? "—"}</b></span>
            </div>
            <div className="flex gap-3 mt-2 text-xs">
              <button onClick={() => setExpanded(isOpen ? null : inv.id)} className="text-coral hover:underline flex items-center gap-1">
                <IndianRupee className="w-3 h-3" /> Settlements {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <button onClick={() => complete(inv)} className="text-gray-500 hover:underline">{inv.status === "completed" ? "Reactivate" : "Mark completed"}</button>
              <button onClick={() => remove(inv)} className="text-red-400 hover:text-red-600">Delete</button>
            </div>
            {isOpen && <SettlementManager investment={inv} />}
          </div>
        );
      })}

      {adding ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 grid grid-cols-2 gap-2 border border-amber-200 dark:border-amber-800">
          <div className="col-span-2">
            <label className={labelClass}>Design *</label>
            <select className={inputClass} value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Select investable design</option>
              {designs.map((d) => <option key={d.id} value={d.id}>{d.design_name || d.name} {d.design_code ? `(${d.design_code})` : ""}</option>)}
            </select>
          </div>
          <div><label className={labelClass}>Start date *</label><input className={inputClass} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div><label className={labelClass}>End date</label><input className={inputClass} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          <div><label className={labelClass}>Amount invested (₹)</label><input className={inputClass} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><label className={labelClass}>Units allocated</label><input className={inputClass} type="number" value={units} onChange={(e) => setUnits(e.target.value)} /></div>
          <div><label className={labelClass}>Payout per unit (₹)</label><input className={inputClass} type="number" value={payout} onChange={(e) => setPayout(e.target.value)} /></div>
          <div><label className={labelClass}>Next settlement date</label><input className={inputClass} type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} /></div>
          <div className="col-span-2 flex gap-2">
            <Button size="sm" onClick={save}>Add investment</Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs text-coral hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add investment</button>
      )}
    </div>
  );
}

// ---- Documents + notify for one investor ----------------------------------
function DocsAndNotify({ investor }: { investor: Investor }) {
  const [docs, setDocs] = useState<InvestorDocument[]>([]);
  const [docType, setDocType] = useState<InvestorDocType>("agreement");
  const [docTitle, setDocTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => { setDocs(await listDocuments(investor.id)); }, [investor.id]);
  useEffect(() => { load(); }, [load]);

  const upload = async () => {
    if (!file) { toast.error("Choose a file"); return; }
    setUploading(true);
    try {
      await uploadDocument({ investor_id: investor.id, doc_type: docType, title: docTitle || file.name, file });
      toast.success("Document uploaded");
      setFile(null); setDocTitle("");
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  const openDoc = async (d: InvestorDocument) => {
    try { window.open(await getDocumentUrl(d.file_path), "_blank"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const removeDoc = async (d: InvestorDocument) => {
    if (!window.confirm("Delete this document?")) return;
    await deleteDocument(d); load();
  };

  const send = async () => {
    if (!title.trim() || !body.trim()) { toast.error("Title and message required"); return; }
    setSending(true);
    try {
      await sendNotification({ investor_id: investor.id, title: title.trim(), body: body.trim() });
      toast.success("Notification sent");
      setTitle(""); setBody("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSending(false); }
  };

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {/* Documents */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1 mb-2"><FileText className="w-4 h-4" /> Documents</h4>
        <div className="space-y-1 mb-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-2 text-xs">
              <button onClick={() => openDoc(d)} className="text-coral hover:underline flex-1 text-left truncate">{d.title || d.doc_type}</button>
              <button onClick={() => removeDoc(d)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
          {docs.length === 0 && <p className="text-xs text-gray-400">No documents.</p>}
        </div>
        <div className="space-y-2">
          <select className={inputClass} value={docType} onChange={(e) => setDocType(e.target.value as InvestorDocType)}>
            {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input className={inputClass} placeholder="Title (optional)" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
          <Button size="sm" onClick={upload} disabled={uploading}>{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}</Button>
        </div>
      </div>

      {/* Notify */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1 mb-2"><Bell className="w-4 h-4" /> Send notification</h4>
        <div className="space-y-2">
          <input className={inputClass} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className={inputClass} rows={3} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button size="sm" onClick={send} disabled={sending}>{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}</Button>
        </div>
      </div>
    </div>
  );
}

// ---- Investor card ---------------------------------------------------------
function InvestorCard({ investor, designs, onChanged }: { investor: Investor; designs: ProductWithCategory[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggleActive = async () => {
    setBusy(true);
    try { await updateInvestor(investor.id, { is_active: !investor.is_active }); toast.success("Updated"); onChanged(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };
  const resetPw = async () => {
    const pw = window.prompt(`New password for ${investor.email} (min 8 chars):`);
    if (!pw) return;
    if (pw.length < 8) { toast.error("Min 8 characters"); return; }
    try { await resetInvestorPassword(investor.id, pw); toast.success("Password reset"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete ${investor.email}? This removes their login, investments and settlements.`)) return;
    try { await deleteInvestor(investor.id); toast.success("Investor deleted"); onChanged(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className={`${cardClass} ${!investor.is_active ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-white">{investor.full_name}</span>
            <span className="text-xs font-mono text-gray-400">{investor.investor_code}</span>
            {!investor.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600">Inactive</span>}
          </div>
          <p className="text-sm text-gray-500">{investor.email}{investor.mobile ? ` · ${investor.mobile}` : ""}</p>
        </div>
        <div className="flex items-center gap-1">
          <button title="Reset password" onClick={resetPw} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><KeyRound className="w-4 h-4" /></button>
          <button title="Delete" onClick={remove} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>{open ? "Close" : "Manage"}</Button>
        <Button variant="outline" size="sm" onClick={toggleActive} disabled={busy}>{investor.is_active ? "Deactivate" : "Activate"}</Button>
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1 mb-2"><Briefcase className="w-4 h-4" /> Investments</h3>
            <InvestmentsManager investor={investor} designs={designs} />
          </div>
          <DocsAndNotify investor={investor} />
        </div>
      )}
    </div>
  );
}

// ---- Page ------------------------------------------------------------------
function InvestorsPageInner() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [designs, setDesigns] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, des] = await Promise.all([listInvestors(), listInvestableDesigns()]);
      setInvestors(inv);
      setDesigns(des);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load investors");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Investors</h1>
        <p className="text-sm text-gray-500">Manage investor accounts, design investments, settlements and documents.</p>
      </div>

      {designs.length === 0 && !loading && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-lg">
          No investable designs yet. Mark a product as an &quot;Investable design&quot; in the Products section first.
        </div>
      )}

      <CreateInvestorForm onCreated={load} />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-coral" /></div>
      ) : (
        <div className="space-y-3">
          {investors.map((i) => <InvestorCard key={i.id} investor={i} designs={designs} onChanged={load} />)}
          {investors.length === 0 && <p className="text-sm text-gray-400">No investors yet.</p>}
        </div>
      )}
    </div>
  );
}

export default function AdminInvestorsPage() {
  return (
    <AdminShell>
      <InvestorsPageInner />
    </AdminShell>
  );
}
