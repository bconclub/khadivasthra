"use client";

import { cn } from "@/lib/utils";

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  inStock: boolean;
  lowStock?: boolean;
}

interface ColorSwatchesProps {
  colors: ColorOption[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export function ColorSwatches({ colors, selected, onSelect }: ColorSwatchesProps) {
  if (!colors || colors.length === 0) return null;

  const selectedColor = colors.find(c => c.id === selected);

  return (
    <div>
      <p className="text-sm font-semibold text-text mb-3">
        Colour{selectedColor ? <span className="font-normal text-text-muted ml-1">— {selectedColor.name}</span> : ""}
      </p>
      <div className="flex flex-wrap gap-3">
        {colors.map((color) => (
          <button
            key={color.id}
            type="button"
            onClick={() => color.inStock && onSelect(color.id)}
            disabled={!color.inStock}
            title={color.name}
            className={cn(
              "group relative w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all",
              selected === color.id
                ? "ring-2 ring-offset-2 ring-coral border-transparent"
                : "border-gray-200 hover:border-gray-300"
            )}
            style={{ backgroundColor: color.hex }}
          >
            {/* Low stock indicator dot */}
            {color.lowStock && color.inStock && selected !== color.id && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
            
            {/* Out of stock diagonal line */}
            {!color.inStock && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-full h-0.5 bg-gray-400 rotate-45 rounded-full" />
              </span>
            )}
            
            {/* Tooltip */}
            <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {color.name}
              {!color.inStock && " (Out of stock)"}
              {color.lowStock && color.inStock && " (Low stock)"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
