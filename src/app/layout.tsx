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
      <head>
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-EGD59S8H70" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-EGD59S8H70');
            `,
          }}
        />
        {/* Meta Pixel */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1639469843739310');
              fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1639469843739310&ev=PageView&noscript=1"
          />
        </noscript>
      </head>
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
