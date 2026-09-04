import type { Metadata } from "next";
import { WholesaleAuthProvider } from "@/context/WholesaleAuthContext";

export const metadata: Metadata = {
  title: "Wholesale | Khadi Vasthra",
  description: "Trade pricing on Kerala handloom, for approved wholesale buyers.",
};

export default function WholesaleLayout({ children }: { children: React.ReactNode }) {
  return (
    <WholesaleAuthProvider>
      <div className="wholesale-layout">{children}</div>
    </WholesaleAuthProvider>
  );
}
