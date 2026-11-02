"use client";

import { useState } from "react";
import { buildPrice, DEFAULT_COURIER_CHARGE, DEFAULT_GST_PERCENT } from "@/lib/pricing";

const inputCls = "w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm";

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-400 mb-1">{label}</label>
      <input type="number" min="0" step="any" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>₹{value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
    </div>
  );
}

/**
 * Works out an inclusive price from its parts: product, GST, courier and courier
 * GST, with the form's discount as the offer. Only fills in the MRP when asked.
 */
export function PriceCalculator({ offerPercent, onApply }: { offerPercent: number; onApply: (mrp: number) => void }) {
  const [productPrice, setProductPrice] = useState("");
  const [gstPercent, setGstPercent] = useState(String(DEFAULT_GST_PERCENT));
  const [courier, setCourier] = useState(String(DEFAULT_COURIER_CHARGE));
  const [courierGstPercent, setCourierGstPercent] = useState(String(DEFAULT_GST_PERCENT));

  const product = parseFloat(productPrice) || 0;
  const courierCharge = parseFloat(courier) || 0;
  const price = buildPrice({
    productPrice: product,
    gstPercent: parseFloat(gstPercent) || 0,
    courierCharge,
    courierGstPercent: parseFloat(courierGstPercent) || 0,
    offerPercent,
  });

  return (
    <details className="pt-3 border-t border-gray-200 dark:border-gray-700">
      <summary className="text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer">Price calculator</summary>
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Product price (₹)" value={productPrice} onChange={setProductPrice} />
          <Field label="GST (%)" value={gstPercent} onChange={setGstPercent} />
          <Field label="Courier charge (₹)" value={courier} onChange={setCourier} />
          <Field label="Courier GST (%)" value={courierGstPercent} onChange={setCourierGstPercent} />
        </div>
        {product > 0 && (
          <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
            <Row label="Product price" value={product} />
            <Row label="GST" value={price.gst} />
            <Row label="Courier charge" value={courierCharge} />
            <Row label="Courier GST" value={price.courierGst} />
            <div className="font-bold pt-1 border-t border-gray-200 dark:border-gray-700">
              <Row label="Selling price (inclusive)" value={price.sellingPrice} />
            </div>
            {offerPercent > 0 && <Row label={`MRP with ${offerPercent}% offer`} value={price.mrp} />}
            <button
              type="button"
              onClick={() => onApply(price.mrp)}
              className="mt-2 px-3 py-1.5 rounded-lg bg-coral text-white text-xs font-semibold hover:bg-coral/90"
            >
              Use ₹{price.mrp.toLocaleString("en-IN")} as Base MRP
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
