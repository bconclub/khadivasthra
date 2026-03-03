"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

const WHATSAPP_NUMBER = "918714090510";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%27m%20interested%20in%20your%20products`;

export function BottomBar() {
    const pathname = usePathname();
    const { cartCount, openCart } = useCart();

    return (
        <div className="bottom-bar fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/60 backdrop-blur-xl border-t border-white/30 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
            <nav className="flex items-center justify-around h-16 px-2">
                <Link
                    href="/"
                    className={`bottom-bar__item flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${pathname === "/" ? "text-coral" : "text-gray-500 hover:text-gray-800"
                        }`}
                >
                    <Home className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>

                <Link
                    href="/account"
                    className={`bottom-bar__item flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${pathname?.startsWith("/account") ? "text-coral" : "text-gray-500 hover:text-gray-800"
                        }`}
                >
                    <User className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Account</span>
                </Link>

                <button
                    onClick={openCart}
                    className="bottom-bar__item flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-gray-500 hover:text-gray-800 transition-colors relative"
                >
                    <div className="relative">
                        <ShoppingBag className="h-5 w-5" />
                        {cartCount > 0 && (
                            <span className="absolute -top-1.5 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-coral text-[9px] text-white font-bold">
                                {cartCount}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-medium">Cart</span>
                </button>

                <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bottom-bar__item flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-green-600 hover:text-green-700 transition-colors"
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span className="text-[10px] font-medium">WhatsApp</span>
                </a>
            </nav>
        </div>
    );
}
