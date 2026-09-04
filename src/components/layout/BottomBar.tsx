"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Tag, ShoppingBag, Search } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useSearch } from "@/context/SearchContext";
import { useWhatsAppLink } from "@/components/useWhatsAppLink";

export function BottomBar() {
    const pathname = usePathname();
    const { cartCount, openCart } = useCart();
    const { openSearch } = useSearch();
    const whatsappHref = useWhatsAppLink();
    const isHome = pathname === "/";
    // WhatsApp ordering only makes sense once the shopper is looking at a
    // specific product; everywhere else that slot is more useful as search.
    const isProductPage = pathname?.startsWith("/product");

    // The quick-action bar used to hide on the homepage until something was in
    // the cart, which left the landing page with no way to reach search, offers
    // or the cart. It now shows everywhere.

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

                {isProductPage ? (
                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bottom-bar__item flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-[#25D366] hover:text-[#1eb855] transition-colors"
                    >
                        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] my-px" fill="currentColor" aria-hidden="true">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.898 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.548 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        <span className="text-[10px] font-medium leading-[1.15] text-center">Buy on<br />WhatsApp</span>
                    </a>
                ) : (
                    <button
                        onClick={openSearch}
                        className="bottom-bar__item flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-gray-700 hover:text-gray-900 transition-colors"
                    >
                        <Search className="h-5 w-5" strokeWidth={1.8} />
                        <span className="text-[10px] font-medium">Search</span>
                    </button>
                )}

            </nav>
        </div>
    );
}
