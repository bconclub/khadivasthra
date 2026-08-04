"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Menu, X, Search } from "lucide-react";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useSearch } from "@/context/SearchContext";
import { Button } from "@/components/ui/button";
import { SideMenu } from "./SideMenu";

export function Header() {
    const { cartCount, openCart } = useCart();
    const { openSearch } = useSearch();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [showHeaderLogo, setShowHeaderLogo] = useState(false);
    const [showHeader, setShowHeader] = useState(true);
    const lastScrollYRef = React.useRef(0);
    const scrollDeltaRef = React.useRef(0);

    // Keep header always visible on desktop for shop/product pages
    const isShopPage = pathname?.startsWith('/shop') || pathname?.startsWith('/product') || pathname?.startsWith('/collections') || pathname?.startsWith('/offers');

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const lastY = lastScrollYRef.current;
            const delta = currentScrollY - lastY;

            // Accumulate scroll delta in same direction, reset on direction change
            if ((delta > 0 && scrollDeltaRef.current > 0) || (delta < 0 && scrollDeltaRef.current < 0)) {
                scrollDeltaRef.current += delta;
            } else {
                scrollDeltaRef.current = delta;
            }

            // Visible at the top of the page; hides on scroll down, returns on
            // scroll up (after 15px of consistent movement in one direction).
            if (currentScrollY <= 80) {
                setShowHeader(true);
            } else if (scrollDeltaRef.current < -15) {
                setShowHeader(true);
            } else if (scrollDeltaRef.current > 15) {
                setShowHeader(false);
            }

            // On the homepage the big hero logo is the branding, so the header
            // logo only fades in once it scrolls past. Every other page has no
            // hero logo, so show it straight away.
            const heroLogo = document.getElementById('hero-logo');
            if (heroLogo) {
                const rect = heroLogo.getBoundingClientRect();
                setShowHeaderLogo(rect.top <= 10);
            } else {
                setShowHeaderLogo(true);
            }

            setScrolled(currentScrollY > 50);
            lastScrollYRef.current = currentScrollY;
        };

        // Run once on mount so a freshly loaded (unscrolled) page gets the
        // right header/logo state instead of waiting for the first scroll.
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [pathname]);

    return (
        <>
        <header className={`header fixed top-0 z-50 w-full transition-all duration-400 ease-in-out ${
                isShopPage
                ? `md:opacity-100 md:translate-y-0 md:pointer-events-auto ${showHeader ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-full pointer-events-none'}`
                : showHeader
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 -translate-y-full pointer-events-none'
            } bg-black/70 backdrop-blur-md border-b border-white/10 shadow-sm rounded-b-2xl overflow-hidden`}>
            <div className="header__container container mx-auto px-4 max-w-7xl flex h-16 md:h-20 items-center justify-between relative">
                {/* Mobile Hamburger - left side, always visible on mobile */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="header__menu-toggle md:hidden text-white hover:text-cream hover:bg-white/20 transition-colors z-10"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>

                {/* Desktop Logo - shows after scroll, or always on shop pages */}
                <div className={`hidden md:block transition-all duration-300 min-w-0 ${showHeaderLogo || isShopPage
                        ? 'opacity-100 translate-y-0 w-auto'
                        : 'opacity-0 -translate-y-2 w-0 pointer-events-none overflow-hidden'
                    }`}>
                    <Link href="/" className="header__logo-link flex items-center">
                        <Image
                            src="/Khadi Vasthra White Transparnt.webp"
                            alt="Khadi Vasthra Logo"
                            width={180}
                            height={60}
                            className="header__logo h-12 w-auto object-contain"
                            priority
                        />
                    </Link>
                </div>

                {/* Mobile Logo - centered, shows after scroll */}
                <div className={`md:hidden absolute left-1/2 -translate-x-1/2 transition-all duration-300 z-0 ${showHeaderLogo
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 -translate-y-2 pointer-events-none'
                    }`}>
                    <Link href="/" className="header__logo-link flex items-center">
                        <Image
                            src="/Khadi Vasthra White Transparnt.webp"
                            alt="Khadi Vasthra Logo"
                            width={120}
                            height={40}
                            className="header__logo h-8 w-auto object-contain"
                            priority
                        />
                    </Link>
                </div>

                {/* Center Nav - absolutely centered, desktop only */}
                <nav className="header__nav header__nav--desktop hidden md:flex items-center space-x-8 transition-all duration-300 absolute left-1/2 -translate-x-1/2">
                    <Link
                        href="/shop"
                        className="header__nav-link text-sm font-medium text-white hover:text-cream transition-colors"
                    >
                        Shop
                    </Link>
                    <Link
                        href="/collections"
                        className="header__nav-link text-sm font-medium text-white hover:text-cream transition-colors"
                    >
                        Collections
                    </Link>
                    <Link
                        href="/contact"
                        className="header__nav-link text-sm font-medium text-white hover:text-cream transition-colors"
                    >
                        About
                    </Link>
                    <Link
                        href="/contact"
                        className="header__nav-link text-sm font-medium text-white hover:text-cream transition-colors"
                    >
                        Contact
                    </Link>
                </nav>

                {/* Right: Search & Cart */}
                <div className="header__actions flex items-center space-x-2 md:space-x-4 ml-auto z-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="header__search-button text-white hover:text-cream hover:bg-white/20"
                        aria-label="Search"
                        onClick={openSearch}
                    >
                        <Search className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="header__cart-button relative text-white hover:text-cream hover:bg-white/20"
                        onClick={openCart}
                    >
                        <ShoppingBag className="h-5 w-5" />
                        {cartCount > 0 && (
                            <span className="header__cart-badge absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-coral text-[10px] text-white font-bold">
                                {cartCount}
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            {/* Mobile Nav */}
        </header>
        <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </>
    );
}
