"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import products from "@/data/products.json";
import { ArrowUpDown } from "lucide-react";

export default function ProductsPage() {
    const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | null>(null);

    const sortedProducts = [...products].sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        return 0;
    });

    return (
        <>
            <div className="products-page__header flex justify-between items-center mb-6">
                <h1 className="products-page__title text-3xl font-bold text-text">All Products</h1>
                <div className="products-page__sort-wrapper relative">
                    <select
                        className="products-page__sort-select appearance-none bg-white border border-cream/30 rounded-md py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-coral cursor-pointer text-text"
                        onChange={(e) => setSortBy(e.target.value === "" ? null : e.target.value as "price-asc" | "price-desc")}
                    >
                        <option value="">Sort by: Featured</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                    </select>
                    <ArrowUpDown className="products-page__sort-icon absolute right-3 top-2.5 h-4 w-4 text-text-muted pointer-events-none" />
                </div>
            </div>

            <div className="products-page__grid grid grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} variant="white" />
                ))}
            </div>
        </>
    );
}
