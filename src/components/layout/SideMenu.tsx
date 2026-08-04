"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getCategories } from "@/lib/services/categories";
import { CATEGORY_GROUPS } from "@/lib/category-groups";
import { X, Instagram, Facebook, Phone, ChevronRight, ImageOff } from "lucide-react";

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
}

const PAGES = [
  { href: "/shop", label: "Shop All" },
  { href: "/offers", label: "Offers" },
  { href: "/collections", label: "Collections" },
  { href: "/contact", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export function SideMenu({ open, onClose }: SideMenuProps) {
  const { data: categories } = useSupabaseQuery(getCategories);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const cats = (categories || []).slice(0, 8);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`side-menu fixed top-0 left-0 z-[61] h-full w-[85%] max-w-sm bg-cream shadow-2xl rounded-r-3xl overflow-y-auto transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-coral rounded-br-3xl">
          <Link href="/" onClick={onClose} className="block">
            <Image
              src="/Khadi Vasthra White Transparnt.webp"
              alt="Khadi Vasthra"
              width={150}
              height={52}
              className="h-11 w-auto object-contain"
              priority
            />
          </Link>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Collections */}
        <div className="px-5 pt-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">Collections</h3>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORY_GROUPS.map((g) => (
              <Link
                key={g.slug}
                href={`/shop/group/${g.slug}`}
                onClick={onClose}
                className="px-3 py-2.5 rounded-xl bg-white text-center text-sm font-semibold text-text hover:bg-coral hover:text-white transition-colors shadow-sm"
              >
                {g.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Categories with images */}
        <div className="px-5 pt-6">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">Shop by Category</h3>
          <div className="grid grid-cols-2 gap-3">
            {cats.map((cat) => (
              <Link
                key={cat.id}
                href={`/shop/${cat.slug}`}
                onClick={onClose}
                className="group rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
              >
                <div className="relative aspect-[4/3] bg-cream/60">
                  {cat.image_url ? (
                    <Image
                      src={cat.image_url}
                      alt={cat.name}
                      fill
                      sizes="160px"
                      className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageOff className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>
                <p className="px-2 py-2 text-[11px] font-semibold text-text leading-tight line-clamp-2 text-center">
                  {cat.name}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Pages */}
        <div className="px-5 pt-6">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">More</h3>
          <nav className="flex flex-col">
            {PAGES.map((p) => (
              <Link
                key={p.label}
                href={p.href}
                onClick={onClose}
                className="flex items-center justify-between py-3 border-b border-black/5 text-sm font-medium text-text hover:text-coral transition-colors"
              >
                {p.label}
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </Link>
            ))}
          </nav>
        </div>

        {/* Social + contact */}
        <div className="px-5 py-6 mt-2">
          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com/khadivasthra"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center text-coral hover:bg-coral hover:text-white transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="https://facebook.com/khadivasthra"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center text-coral hover:bg-coral hover:text-white transition-colors"
            >
              <Facebook className="w-5 h-5" />
            </a>
            <a
              href="tel:+918714090510"
              aria-label="Call us"
              className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center text-coral hover:bg-coral hover:text-white transition-colors"
            >
              <Phone className="w-5 h-5" />
            </a>
          </div>
          <p className="text-xs text-text-muted mt-4 leading-relaxed">
            Kurumassery, Aluva, Ernakulam, Kerala
            <br />
            <a href="tel:+918714090510" className="hover:text-coral">+91 87140 90510</a>
          </p>
        </div>
      </aside>
    </>
  );
}
