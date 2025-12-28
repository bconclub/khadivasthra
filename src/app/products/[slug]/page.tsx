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
            <div className="py-20 text-center text-gray-500">
                <h2 className="text-xl font-bold mb-2">Category Not Found</h2>
                <p>We couldn't find the category you're looking for.</p>
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
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-primary">{categoryName}</h1>
                <div className="relative">
                    <select
                        className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        onChange={(e) => setSortBy(e.target.value === "" ? null : e.target.value as "price-asc" | "price-desc")}
                    >
                        <option value="">Sort by: Featured</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                    </select>
                    <ArrowUpDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {sortedProducts.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center text-gray-500">
                    No products found in this category.
                </div>
            )}
        </>
    );
}
