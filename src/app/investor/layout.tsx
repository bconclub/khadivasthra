import type { Metadata } from "next";
import { InvestorAuthProvider } from "@/context/InvestorAuthContext";

export const metadata: Metadata = {
  title: "Investor Portal | Khadi Vasthra",
  description: "Track the performance of the designs you invested in.",
};

export default function InvestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <InvestorAuthProvider>
      <div className="investor-layout">{children}</div>
    </InvestorAuthProvider>
  );
}
