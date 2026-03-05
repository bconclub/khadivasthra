"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { BottomBar } from "./BottomBar";
import { SearchOverlay } from "./SearchOverlay";
import { useSearch } from "@/context/SearchContext";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const { isSearchOpen, closeSearch } = useSearch();

  if (isAdminRoute) {
    return <>{children}</>;
  }

  const isShopPage = pathname?.startsWith('/shop') || pathname?.startsWith('/product') || pathname?.startsWith('/collections') || pathname?.startsWith('/offers');

  return (
    <>
      <Header />
      <main className={`flex-grow pb-16 md:pb-0 ${isShopPage ? 'md:pt-20' : ''}`}>{children}</main>
      <Footer />
      <CartDrawer />
      <BottomBar />
      <SearchOverlay isOpen={isSearchOpen} onClose={closeSearch} />
    </>
  );
}
