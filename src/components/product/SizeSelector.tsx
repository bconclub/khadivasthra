"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Ruler } from "lucide-react";

interface SizeSelectorProps {
  sizes: string[];
  selected: string | null;
  availableSizes: string[];
  onSelect: (size: string) => void;
}

export function SizeSelector({ sizes, selected, availableSizes, onSelect }: SizeSelectorProps) {
  const [showGuide, setShowGuide] = useState(false);

  if (!sizes || sizes.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="text-xs text-coral hover:underline flex items-center gap-1"
        >
          <Ruler className="w-3 h-3" /> Size Guide
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const isAvailable = availableSizes.includes(size);
          const isSelected = selected === size;
          return (
            <button
              key={size}
              type="button"
              onClick={() => isAvailable && onSelect(size)}
              disabled={!isAvailable}
              className={cn(
                "min-w-[44px] px-3 py-1.5 rounded-lg border text-sm font-bold transition-all",
                isSelected
                  ? "border-coral bg-coral text-white"
                  : isAvailable
                    ? "border-gray-300 text-text hover:border-coral"
                    : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {size}
            </button>
          );
        })}
      </div>

      {/* Size Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Size Guide</h3>
              <button onClick={() => setShowGuide(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 font-semibold text-gray-700 dark:text-gray-300">Size</th>
                    <th className="text-left py-2 font-semibold text-gray-700 dark:text-gray-300">Length (m)</th>
                    <th className="text-left py-2 font-semibold text-gray-700 dark:text-gray-300">Width (cm)</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 dark:text-gray-400">
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 font-medium">S</td>
                    <td className="py-2">2.0</td>
                    <td className="py-2">90</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 font-medium">M</td>
                    <td className="py-2">2.2</td>
                    <td className="py-2">95</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 font-medium">L</td>
                    <td className="py-2">2.4</td>
                    <td className="py-2">100</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 font-medium">XL</td>
                    <td className="py-2">2.6</td>
                    <td className="py-2">105</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">XXL</td>
                    <td className="py-2">2.8</td>
                    <td className="py-2">110</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              Measurements are approximate. For mundus and dhotis, length refers to the total fabric length.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
