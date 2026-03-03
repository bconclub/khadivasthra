"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Tag, ShoppingBag, Search, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useSearch } from "@/context/SearchContext";

export function BottomBar() {
    const pathname = usePathname();
    const { cartCount, openCart } = useCart();
    const { openSearch } = useSearch();
    const isHome = pathname === "/";

    // On home page, hide unless cart has items
    if (isHome && cartCount === 0) return null;

    return (
        <div className={`bottom-bar fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/80 backdrop-blur-xl border-t border-gray-200/60 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-all duration-300 ${isHome ? 'animate-slide-up' : ''}`}>
            <nav className="flex items-center justify-around h-16 px-1">
                <Link
                    href="/"
                    className={`bottom-bar__item flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${pathname === "/" ? "text-coral" : "text-gray-700 hover:text-gray-900"
                        }`}
                >
                    <Home className="h-5 w-5" strokeWidth={pathname === "/" ? 2.5 : 1.8} />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>

                <Link
                    href="/offers"
                    className={`bottom-bar__item flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${pathname?.startsWith("/offers") ? "text-coral" : "text-gray-700 hover:text-gray-900"
                        }`}
                >
                    <Tag className="h-5 w-5" strokeWidth={pathname?.startsWith("/offers") ? 2.5 : 1.8} />
                    <span className="text-[10px] font-medium">Offers</span>
                </Link>

                <button
                    onClick={openCart}
                    className="bottom-bar__item flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-gray-700 hover:text-gray-900 transition-colors relative"
                >
                    <div className="relative">
                        <ShoppingBag className="h-5 w-5" strokeWidth={1.8} />
                        {cartCount > 0 && (
                            <span className="absolute -top-1.5 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-coral text-[9px] text-white font-bold">
                                {cartCount}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-medium">Cart</span>
                </button>

                <button
                    onClick={openSearch}
                    className="bottom-bar__item flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-gray-700 hover:text-gray-900 transition-colors"
                >
                    <Search className="h-5 w-5" strokeWidth={1.8} />
                    <span className="text-[10px] font-medium">Search</span>
                </button>

                <Link
                    href="/account"
                    className={`bottom-bar__item flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${pathname?.startsWith("/account") ? "text-coral" : "text-gray-700 hover:text-gray-900"
                        }`}
                >
                    <User className="h-5 w-5" strokeWidth={pathname?.startsWith("/account") ? 2.5 : 1.8} />
                    <span className="text-[10px] font-medium">Account</span>
                </Link>
            </nav>
        </div>
    );
}
