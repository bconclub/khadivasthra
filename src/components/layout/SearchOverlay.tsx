"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";

interface SearchResult {
    id: string;
    name: string;
    slug: string;
    price: number;
    compare_price: number | null;
    image_url: string | null;
    category: { name: string } | { name: string }[] | null;
}

export function SearchOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
            setQuery("");
            setResults([]);
        }
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    // Escape to close
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    const searchProducts = useCallback(async (searchQuery: string) => {
        if (searchQuery.trim().length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const { data } = await supabase
            .from("products")
            .select("id, name, slug, price, compare_price, image_url, category:categories(name)")
            .eq("is_active", true)
            .ilike("name", `%${searchQuery}%`)
            .limit(12);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setResults((data as any[] as SearchResult[]) || []);
        setLoading(false);
    }, []);

    const handleInputChange = (value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchProducts(value), 300);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white w-full max-h-[85vh] overflow-y-auto animate-slide-down"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                    <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder="Search products..."
                        className="flex-1 text-base outline-none placeholder:text-gray-400"
                    />
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Results */}
                <div className="px-4 py-4">
                    {loading && (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-coral" />
                        </div>
                    )}

                    {!loading && query.length >= 2 && results.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">No products found for &quot;{query}&quot;</p>
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {results.map((product) => (
                                <Link
                                    key={product.id}
                                    href={`/product/${product.slug}`}
                                    onClick={onClose}
                                    className="group block bg-cream/30 rounded-xl overflow-hidden hover:shadow-md transition-all"
                                >
                                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                                        {product.image_url ? (
                                            <Image
                                                src={product.image_url}
                                                alt={product.name}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform"
                                                sizes="(max-width: 768px) 50vw, 25vw"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Search className="h-8 w-8 text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2.5">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider">
                                            {Array.isArray(product.category) ? product.category[0]?.name : product.category?.name || ""}
                                        </p>
                                        <h4 className="text-xs font-semibold text-text line-clamp-2 mt-0.5">
                                            {product.name}
                                        </h4>
                                        <p className="text-sm font-bold text-orange mt-1">₹{product.price}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {!loading && query.length < 2 && (
                        <p className="text-center text-sm text-gray-400 py-8">
                            Type at least 2 characters to search
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
