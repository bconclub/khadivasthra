"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { BottomBar } from "./BottomBar";
import { SearchOverlay } from "./SearchOverlay";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useSearch } from "@/context/SearchContext";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const isInvestorRoute = pathname?.startsWith("/investor");
  const { isSearchOpen, closeSearch } = useSearch();

  if (isAdminRoute || isInvestorRoute) {
    return <>{children}</>;
  }

  // Only the homepage tucks its hero under the fixed header; every other
  // route needs clearance or the header sits on top of the page heading.
  const isHome = pathname === '/';

  return (
    <>
      <ScrollToTop />
      <Header />
      {/* Shop/product pages sit under a fixed header (h-16 mobile, h-20 desktop),
          so they need matching top padding or the content slides underneath. */}
      <main className={`flex-grow pb-16 md:pb-0 ${isHome ? '' : 'pt-16 md:pt-20'}`}>{children}</main>
      <Footer />
      <CartDrawer />
      <BottomBar />
      <SearchOverlay isOpen={isSearchOpen} onClose={closeSearch} />
    </>
  );
}
