"use client";

import { useState } from "react";
import Image from "next/image";
import { getAllProducts } from "@/lib/services/admin";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { storageImage, IMG } from "@/lib/image";
import { X, Search, GripVertical, Plus, ChevronUp, ChevronDown } from "lucide-react";

interface ProductPickerProps {
  /** Ordered ids. Array order *is* display order. */
  value: string[];
  onChange: (ids: string[]) => void;
  label: string;
  hint?: string;
  placeholder?: string;
  emptyText?: string;
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-coral focus:border-transparent";

/**
 * Search-and-order product list, shared by looks and combos: both need a
 * hand-picked set where the admin controls the order.
 */
export function ProductPicker({
  value,
  onChange,
  label,
  hint,
  placeholder = "Search products to add...",
  emptyText = "No products yet — search above to add them.",
}: ProductPickerProps) {
  const [search, setSearch] = useState("");
  const { data: products } = useSupabaseQuery(getAllProducts);

  const all = products || [];
  const chosen = value
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const matches = search.trim()
    ? all
        .filter(
          (p) => !value.includes(p.id) && p.name.toLowerCase().includes(search.trim().toLowerCase())
        )
        .slice(0, 8)
    : [];

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} <span className="text-gray-400 font-normal">({value.length})</span>
      </label>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className={`${inputCls} pl-9`}
        />
        {matches.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {matches.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange([...value, p.id]);
                  setSearch("");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-cream/50 dark:hover:bg-gray-700 text-left"
              >
                {p.image_url && (
                  <Image
                    src={storageImage(p.image_url, IMG.thumb)}
                    alt=""
                    width={32}
                    height={40}
                    className="w-8 h-10 object-cover rounded"
                    unoptimized
                  />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-200 flex-1 truncate">
                  {p.name}
                </span>
                <Plus className="w-4 h-4 text-coral flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {chosen.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center">{emptyText}</p>
        ) : (
          chosen.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1.5"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  className="text-gray-400 hover:text-coral disabled:opacity-20"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === chosen.length - 1}
                  className="text-gray-400 hover:text-coral disabled:opacity-20"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
              {p.image_url && (
                <Image
                  src={storageImage(p.image_url, IMG.thumb)}
                  alt=""
                  width={28}
                  height={36}
                  className="w-7 h-9 object-cover rounded flex-shrink-0"
                  unoptimized
                />
              )}
              <span className="text-xs text-gray-700 dark:text-gray-200 flex-1 truncate">
                {p.name}
              </span>
              <span className="text-[10px] text-gray-400">
                ₹{Number(p.price).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((id) => id !== p.id))}
                className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                aria-label="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
