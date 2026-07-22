"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listInvestors, listInvestmentsForProduct, createInvestment, deleteInvestment,
} from "@/lib/services/investors";
import { updateProduct } from "@/lib/services/admin";
import type { Investor, Investment, ProductWithCategory } from "@/types";
import toast from "react-hot-toast";

interface ProductInvestorModalProps {
  product: ProductWithCategory;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductInvestorModal({ product, onClose, onSaved }: ProductInvestorModalProps) {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [investorId, setInvestorId] = useState("");
  const [amount, setAmount] = useState("");
  const [units, setUnits] = useState("");
  const [payout, setPayout] = useState("75");
  const [investable, setInvestable] = useState(product.is_investable);

  const load = async () => {
    setLoading(true);
    try {
      const [investorList, investmentList] = await Promise.all([
        listInvestors(),
        listInvestmentsForProduct(product.id),
      ]);
      setInvestors(investorList.filter((i) => i.is_active));
      setInvestments(investmentList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load investors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const handleMarkInvestable = async () => {
    try {
      await updateProduct(product.id, { is_investable: true });
      setInvestable(true);
      toast.success("Marked as investable design");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investorId || !amount || !units) return;
    setSubmitting(true);
    try {
      if (!investable) {
        await updateProduct(product.id, { is_investable: true });
        setInvestable(true);
      }
      await createInvestment({
        investor_id: investorId,
        product_id: product.id,
        start_date: new Date().toISOString().slice(0, 10),
        amount_invested: parseFloat(amount),
        units_allocated: parseInt(units, 10),
        per_unit_payout: parseFloat(payout) || 0,
      });
      toast.success("Investor assigned to this design");
      setInvestorId(""); setAmount(""); setUnits(""); setPayout("75");
      await load();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign investor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (investment: Investment) => {
    if (!window.confirm("Remove this investor from the design? This also removes their settlement history.")) return;
    try {
      await deleteInvestment(investment.id);
      toast.success("Investor removed");
      await load();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  const assignedInvestorIds = new Set(investments.map((i) => i.investor_id));
  const availableInvestors = investors.filter((i) => !assignedInvestorIds.has(i.id));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-lg w-full shadow-xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" /> Design Investors
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate">{product.name}</p>

        {!investable && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-lg mb-4 flex items-center justify-between gap-3">
            <span>This product isn&apos;t marked investable yet.</span>
            <Button type="button" size="sm" variant="primary" onClick={handleMarkInvestable}>
              Mark Investable
            </Button>
          </div>
        )}

        {investable && !product.design_code && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3 rounded-lg mb-4">
            Tip: add a Design ID, design name and photo via the product&apos;s Edit form so investors can identify it.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-coral" />
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-5 max-h-52 overflow-y-auto">
              {investments.length === 0 ? (
                <p className="text-sm text-gray-400">No investors assigned yet.</p>
              ) : (
                investments.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {inv.investor?.full_name || "Investor"} <span className="text-gray-400 font-normal">({inv.investor?.investor_code})</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ₹{Number(inv.amount_invested).toLocaleString()} invested &middot; {inv.units_allocated} units &middot; ₹{inv.per_unit_payout}/unit
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(inv)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAssign} className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Assign an Investor</h3>
              <select
                value={investorId}
                onChange={(e) => setInvestorId(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
              >
                <option value="">Choose an investor...</option>
                {availableInvestors.map((inv) => (
                  <option key={inv.id} value={inv.id}>{inv.full_name} ({inv.investor_code})</option>
                ))}
              </select>
              {investors.length === 0 && (
                <p className="text-xs text-amber-600">No investors found — add one in Investors first.</p>
              )}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Amount Invested</label>
                  <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                    required className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-coral focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Units Allocated</label>
                  <input type="number" min="0" value={units} onChange={(e) => setUnits(e.target.value)}
                    required className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-coral focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Payout/Unit</label>
                  <input type="number" min="0" step="0.01" value={payout} onChange={(e) => setPayout(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-coral focus:border-transparent" />
                </div>
              </div>
              <Button type="submit" variant="primary" className="w-full" disabled={submitting || !investorId}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Assign Investor
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
