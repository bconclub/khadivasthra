"use client";

import { useInvestorAuth } from "@/context/InvestorAuthContext";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";

export function InvestorShell({ children }: { children: React.ReactNode }) {
  const { user, investor, ready, signOut } = useInvestorAuth();
  const router = useRouter();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream/30">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  if (!user) {
    router.replace("/investor/login");
    return null;
  }

  // Logged in via Supabase but no active investor profile (e.g. an admin, or a
  // deactivated investor). Don't leak the dashboard.
  if (!investor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-cream/30 px-6 text-center">
        <p className="text-gray-700 font-medium">This account is not an active investor.</p>
        <p className="text-sm text-gray-500">Contact Khadi Vasthra if you believe this is a mistake.</p>
        <button
          onClick={async () => { await signOut(); router.replace("/investor/login"); }}
          className="text-sm text-coral hover:underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace("/investor/login");
  };

  return (
    <div className="min-h-screen bg-cream/30">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-coral font-serif leading-tight">Khadi Vasthra</div>
            <div className="text-xs text-gray-500">Investor Portal</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-800">{investor.full_name}</div>
              <div className="text-xs text-gray-400">{investor.investor_code}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-coral transition-colors"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
