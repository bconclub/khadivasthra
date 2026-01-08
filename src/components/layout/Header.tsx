"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Menu, X, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";

export function Header() {
    const { cartCount } = useCart();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [showHeaderLogo, setShowHeaderLogo] = useState(false);
    const [showHeader, setShowHeader] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const heroLogo = document.getElementById('hero-logo');
            if (heroLogo) {
                const rect = heroLogo.getBoundingClientRect();
                // Show header when hero logo reaches or passes header position (~80px from top)
                const headerHeight = 80; // Header height threshold
                const shouldShowHeader = rect.top <= headerHeight;
                setShowHeader(shouldShowHeader);
                setShowHeaderLogo(shouldShowHeader);
            } else {
                // If no hero logo found, show header after scrolling
                setShowHeader(window.scrollY > 100);
                setShowHeaderLogo(window.scrollY > 100);
            }
            setScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        // Check on mount in case page is already scrolled
        handleScroll();
        
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`header fixed top-0 z-50 w-full transition-all duration-300 ${
            showHeader 
                ? 'opacity-100 translate-y-0 pointer-events-auto' 
                : 'opacity-0 -translate-y-full pointer-events-none'
        } bg-black/50 backdrop-blur-md border-b border-white/10 shadow-sm`}>
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

                {/* Desktop Logo - shows after scroll */}
                <div className={`hidden md:block transition-all duration-300 min-w-0 ${
                    showHeaderLogo 
                        ? 'opacity-100 translate-y-0 w-auto' 
                        : 'opacity-0 -translate-y-2 w-0 pointer-events-none overflow-hidden'
                }`}>
                    <Link href="/" className="header__logo-link flex items-center">
                        <Image
                            src="/Khadi Vasthra White Transparnt.png"
                            alt="Khadi Vasthra Logo"
                            width={180}
                            height={60}
                            className="header__logo h-12 w-auto object-contain"
                            priority
                        />
                    </Link>
                </div>

                {/* Mobile Logo - centered, shows after scroll */}
                <div className={`md:hidden absolute left-1/2 -translate-x-1/2 transition-all duration-300 z-0 ${
                    showHeaderLogo 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}>
                    <Link href="/" className="header__logo-link flex items-center">
                        <Image
                            src="/Khadi Vasthra White Transparnt.png"
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
                        href="/products" 
                        className="header__nav-link text-sm font-medium text-white hover:text-cream transition-colors"
                    >
                        Shop
                    </Link>
                    <Link 
                        href="/products" 
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
                    >
                        <Search className="h-5 w-5" />
                    </Button>
                    <Link href="/cart" className="header__cart-link">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="header__cart-button relative text-white hover:text-cream hover:bg-white/20"
                        >
                            <ShoppingBag className="h-5 w-5" />
                            {cartCount > 0 && (
                                <span className="header__cart-badge absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-coral text-[10px] text-white font-bold">
                                    {cartCount}
                                </span>
                            )}
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Mobile Nav */}
            {isMenuOpen && (
                <div className="header__mobile-nav md:hidden border-t border-white/10 p-4 bg-black/50 backdrop-blur-md">
                    <nav className="header__nav header__nav--mobile flex flex-col space-y-4">
                        <Link
                            href="/products"
                            className="header__nav-link text-sm font-medium text-white hover:text-cream transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Shop
                        </Link>
                        <Link
                            href="/products"
                            className="header__nav-link text-sm font-medium text-white hover:text-cream transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Collections
                        </Link>
                        <Link
                            href="/contact"
                            className="header__nav-link text-sm font-medium text-white hover:text-cream transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            About
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
