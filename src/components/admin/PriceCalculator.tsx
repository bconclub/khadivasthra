"use client";

import { useState } from "react";
import { buildPrice, DEFAULT_COURIER_CHARGE, DEFAULT_GST_PERCENT, DEFAULT_MARGIN_PERCENT } from "@/lib/pricing";

const inputCls = "w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm";

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-400 mb-1">{label}</label>
      <input type="number" min="0" step="any" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>₹{value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  );
}

/**
 * Follows the price chart: costs plus a margin on the price before GST, GST
 * on top, and the form's discount as the offer. Only fills in the MRP when asked.
 */
export function PriceCalculator({ offerPercent, onApply }: { offerPercent: number; onApply: (mrp: number) => void }) {
  const [production, setProduction] = useState("");
  const [landing, setLanding] = useState("");
  const [courier, setCourier] = useState(String(DEFAULT_COURIER_CHARGE));
  const [margin, setMargin] = useState(String(DEFAULT_MARGIN_PERCENT));
  const [gstPercent, setGstPercent] = useState(String(DEFAULT_GST_PERCENT));

  const productionCost = parseFloat(production) || 0;
  const landingCost = parseFloat(landing) || 0;
  const courierCharge = parseFloat(courier) || 0;
  const marginPercent = parseFloat(margin) || 0;
  const gst = parseFloat(gstPercent) || 0;
  const price = buildPrice({ productionCost, landingCost, courierCharge, marginPercent, gstPercent: gst, offerPercent });
  const mrp = Math.round(price.regular);

  return (
    <details className="pt-3 border-t border-gray-200 dark:border-gray-700">
      <summary className="text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer">Price calculator</summary>
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Field label="Production cost (₹)" value={production} onChange={setProduction} />
          <Field label="Store landing cost (₹)" value={landing} onChange={setLanding} />
          <Field label="Courier / postal (₹)" value={courier} onChange={setCourier} />
          <Field label="Margin (%)" value={margin} onChange={setMargin} />
          <Field label="GST (%)" value={gstPercent} onChange={setGstPercent} />
        </div>
        {productionCost > 0 && (
          <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
            <Row label="Total cost" value={price.totalCost} bold />
            <Row label={`Profit for ${marginPercent}% margin`} value={price.profit} />
            <Row label="Selling price before GST" value={price.beforeGst} />
            <Row label={`GST at ${gst}%`} value={price.gst} />
            <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
              <Row label="Regular selling price" value={price.regular} bold />
            </div>
            {offerPercent > 0 && (
              <>
                <Row label={`${offerPercent}% offer discount`} value={-price.offerDiscount} />
                <Row label="Final offer price" value={price.offerPrice} bold />
              </>
            )}
            <button
              type="button"
              onClick={() => onApply(mrp)}
              className="mt-2 px-3 py-1.5 rounded-lg bg-coral text-white text-xs font-semibold hover:bg-coral/90"
            >
              Use ₹{mrp.toLocaleString("en-IN")} as Base MRP
            </button>
            <p className="text-[10px] text-gray-400">The discount above is the offer. COD commission is charged separately at checkout.</p>
          </div>
        )}
      </div>
    </details>
  );
}
