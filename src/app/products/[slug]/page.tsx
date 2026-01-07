"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import products from "@/data/products.json";
import { ArrowUpDown } from "lucide-react";
import { useParams } from "next/navigation";

function slugify(text: string) {
    return text.toLowerCase().replace(/ /g, "-").replace(/\./g, "");
}

// Map slugs back to category names approx or just filter by slugified category
const getCategoryFromSlug = (slug: string) => {
    const categories = Array.from(new Set(products.map(p => p.category)));
    return categories.find(c => slugify(c) === slug);
}

export default function CategoryPage() {
    const params = useParams();
    const slug = params.slug as string;
    const categoryName = getCategoryFromSlug(slug);

    const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | null>(null);

    if (!categoryName) {
        return (
            <div className="category-page__error py-20 text-center text-text-muted">
                <h2 className="category-page__error-title text-xl font-bold mb-2 text-text">Category Not Found</h2>
                <p className="category-page__error-message">We couldn't find the category you're looking for.</p>
            </div>
        );
    }

    const filteredProducts = products.filter(p => p.category === categoryName);

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        return 0;
    });

    return (
        <>
            <div className="category-page__header flex justify-between items-center mb-6">
                <h1 className="category-page__title text-3xl font-bold text-text">{categoryName}</h1>
                <div className="category-page__sort-wrapper relative">
                    <select
                        className="category-page__sort-select appearance-none bg-white border border-cream/30 rounded-md py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-coral cursor-pointer text-text"
                        onChange={(e) => setSortBy(e.target.value === "" ? null : e.target.value as "price-asc" | "price-desc")}
                    >
                        <option value="">Sort by: Featured</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                    </select>
                    <ArrowUpDown className="category-page__sort-icon absolute right-3 top-2.5 h-4 w-4 text-text-muted pointer-events-none" />
                </div>
            </div>

            {sortedProducts.length > 0 ? (
                <div className="category-page__grid grid grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedProducts.map((product) => (
                        <ProductCard key={product.id} product={product} variant="white" />
                    ))}
                </div>
            ) : (
                <div className="category-page__empty py-20 text-center text-text-muted">
                    <p className="category-page__empty-message">No products found in this category.</p>
                </div>
            )}
        </>
    );
}
