"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface SlideOverProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Panel width. Orders need more room than a product summary. */
  width?: "md" | "lg" | "xl";
  children: React.ReactNode;
}

const WIDTH = {
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

/**
 * The one right-hand panel used across the admin. Anything you open - an order,
 * a product - slides in from the right over the list you were looking at, so
 * you keep your place instead of navigating away and losing it.
 */
export function SlideOver({ title, subtitle, onClose, width = "lg", children }: SlideOverProps) {
  // Escape closes, and the page behind must not scroll away under the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 z-40 animate-in fade-in" />
      <aside
        className={`fixed top-0 right-0 h-full w-full ${WIDTH[width]} bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col`}
        role="dialog"
        aria-label={title}
      >
        <header className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 dark:text-white leading-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </aside>
    </>
  );
}
