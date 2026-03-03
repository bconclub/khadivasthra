"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, ShoppingBag, MessageCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";

const WHATSAPP_NUMBER = "918714090510";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%27m%20interested%20in%20your%20products`;

export function BottomBar() {
    const pathname = usePathname();
    const { cartCount, openCart } = useCart();

    return (
        <div className="bottom-bar fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
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
                    <MessageCircle className="h-5 w-5" />
                    <span className="text-[10px] font-medium">WhatsApp</span>
                </a>
            </nav>
        </div>
    );
}
