"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2 } from "lucide-react";

const ProductDetailPage = dynamic(
  () => import("./product/[slug]/page"),
  { ssr: false, loading: () => (
    <div className="container mx-auto px-4 max-w-7xl py-20 flex justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-coral" />
    </div>
  )}
);

const ShopCategoryClient = dynamic(
  () => import("./shop/[category]/ShopCategoryClient"),
  { ssr: false, loading: () => (
    <div className="container mx-auto px-4 max-w-7xl py-20 flex justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-coral" />
    </div>
  )}
);

export default function NotFound() {
  const [pageType, setPageType] = useState<"loading" | "product" | "category" | "404">("loading");
  const [categorySlug, setCategorySlug] = useState("");

  useEffect(() => {
    const path = window.location.pathname;
    if (/^\/product\/[^/]+\/?$/.test(path)) {
      setPageType("product");
    } else if (/^\/shop\/[^/]+\/?$/.test(path)) {
      setCategorySlug(path.split('/')[2]);
      setPageType("category");
    } else {
      setPageType("404");
    }
  }, []);

  if (pageType === "loading") return null;
  if (pageType === "product") return <ProductDetailPage />;
  if (pageType === "category") return <ShopCategoryClient slug={categorySlug} />;

  return (
    <div className="container mx-auto px-4 max-w-7xl py-20 text-center">
      <h1 className="text-8xl font-bold text-cream mb-4 font-serif">404</h1>
      <p className="text-xl text-text-muted mb-8">This page could not be found.</p>
      <Link href="/" className="inline-block bg-coral text-white px-6 py-3 rounded-full font-semibold hover:bg-coral-dark transition-colors">
        Back to Home
      </Link>
    </div>
  );
}
