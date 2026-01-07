"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";

export function Header() {
    const { cartCount } = useCart();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="header sticky top-0 z-50 w-full backdrop-blur-md bg-white/10 border-b border-white/20 shadow-lg relative">
            <div className="header__container container mx-auto px-4 max-w-7xl flex h-24 items-center justify-between">
                <Link href="/" className="header__logo-link flex items-center">
                    <Image
                        src="/Khadi Vasthra White Transparnt.png"
                        alt="Khadi Vasthra Logo"
                        width={270}
                        height={90}
                        className="header__logo h-[72px] w-auto object-contain"
                        priority
                    />
                </Link>

                {/* Desktop Nav */}
                <nav className="header__nav header__nav--desktop hidden md:flex items-center space-x-8">
                    <Link href="/" className="header__nav-link text-sm font-medium text-white hover:text-cream transition-colors">
                        Home
                    </Link>
                    <Link href="/products" className="header__nav-link text-sm font-medium text-white hover:text-cream transition-colors">
                        Our Collection
                    </Link>
                    <Link href="/contact" className="header__nav-link text-sm font-medium text-white hover:text-cream transition-colors">
                        Contact
                    </Link>
                </nav>

                <div className="header__actions flex items-center space-x-4">
                    <Link href="/cart" className="header__cart-link">
                        <Button variant="ghost" size="icon" className="header__cart-button relative text-white hover:text-cream hover:bg-white/20">
                            <ShoppingBag className="h-5 w-5" />
                            {cartCount > 0 && (
                                <span className="header__cart-badge absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-[#EA4C6B] font-bold">
                                    {cartCount}
                                </span>
                            )}
                        </Button>
                    </Link>

                    {/* Mobile Menu Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="header__menu-toggle md:hidden text-white hover:text-cream hover:bg-white/20"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            {/* Mobile Nav */}
            {isMenuOpen && (
                <div className="header__mobile-nav md:hidden border-t border-white/20 p-4 backdrop-blur-md bg-white/10">
                    <nav className="header__nav header__nav--mobile flex flex-col space-y-4">
                        <Link
                            href="/"
                            className="header__nav-link text-sm font-medium text-white hover:text-cream transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Home
                        </Link>
                        <Link
                            href="/products"
                            className="header__nav-link text-sm font-medium text-white hover:text-cream transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Our Collection
                        </Link>
                        <Link
                            href="/contact"
                            className="header__nav-link text-sm font-medium text-white hover:text-cream transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Contact
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    );
}
