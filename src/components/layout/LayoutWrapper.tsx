"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    // Admin routes get no header/footer
    return <>{children}</>;
  }

  // Regular routes get header/footer + cart drawer
  return (
    <>
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
      <CartDrawer />
    </>
  );
}
