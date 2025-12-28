import Link from "next/link";
import { cn } from "@/lib/utils";

const CATEGORIES = [
    "White Mundus",
    "Offwhite Mundus",
    "4.5m Double Mundus",
    "Printed Mundus",
    "Yellow Double Mundus",
    "Single Mundus",
    "Kavi Mundus"
];

function slugify(text: string) {
    return text.toLowerCase().replace(/ /g, "-").replace(/\./g, "");
}

export default function ProductsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="container-custom py-12">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <aside className="md:w-64 flex-shrink-0 hidden md:block">
                    <div className="sticky top-24">
                        <h3 className="font-bold text-lg mb-4 text-primary">Categories</h3>
                        <div className="flex flex-col space-y-1">
                            <Link
                                href="/products"
                                className="px-3 py-2 rounded-md hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
                            >
                                All Products
                            </Link>
                            {CATEGORIES.map((category) => (
                                <Link
                                    key={category}
                                    href={`/products/${slugify(category)}`}
                                    className="px-3 py-2 rounded-md hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
                                >
                                    {category}
                                </Link>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Mobile Filters (Simplified) */}
                <div className="md:hidden mb-6 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    <div className="flex space-x-2">
                        <Link
                            href="/products"
                            className="flex-shrink-0 px-4 py-2 bg-gray-100 rounded-full text-sm font-medium whitespace-nowrap active:bg-primary active:text-white"
                        >
                            All
                        </Link>
                        {CATEGORIES.map((category) => (
                            <Link
                                key={category}
                                href={`/products/${slugify(category)}`}
                                className="flex-shrink-0 px-4 py-2 bg-gray-100 rounded-full text-sm font-medium whitespace-nowrap active:bg-primary active:text-white"
                            >
                                {category}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
