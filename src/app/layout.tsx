import type { Metadata } from "next";
import { Playfair_Display, Outfit } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { SearchProvider } from "@/context/SearchContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: '--font-playfair',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Khadi Vasthra - Kerala Handloom Mundus & Dhotis | Since 1990",
  description: "Premium traditional Kerala mundus and dhotis. Shop authentic Khadi mundus online from Aluva, Kerala.",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${playfair.variable} font-sans min-h-screen flex flex-col bg-white text-text antialiased`}>
        <AdminAuthProvider>
          <CartProvider>
            <SearchProvider>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
            </SearchProvider>
            <ToastProvider />
          </CartProvider>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
