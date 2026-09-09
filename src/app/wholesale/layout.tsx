import type { Metadata } from "next";
import { WholesaleAuthProvider } from "@/context/WholesaleAuthContext";

export const metadata: Metadata = {
  title: "Wholesale | Khadi Vasthra",
  description: "Browse Kerala handloom wholesale prices and minimum order quantities.",
};

export default function WholesaleLayout({ children }: { children: React.ReactNode }) {
  return (
    <WholesaleAuthProvider>
      <div className="wholesale-layout">{children}</div>
    </WholesaleAuthProvider>
  );
}
