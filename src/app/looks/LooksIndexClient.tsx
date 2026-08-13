"use client";

import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getLooks } from "@/lib/services/looks";
import { LookCard } from "@/components/shop/LookBrowser";
import { Loader2 } from "lucide-react";

export default function LooksIndexClient() {
  const { data: looks, loading } = useSupabaseQuery(getLooks);
  const all = looks || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 max-w-7xl py-8 md:py-12">
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 rounded-full bg-coral/10 text-coral text-xs font-semibold uppercase tracking-wider mb-3">
            Shop the Look
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-text font-serif">Our Looks</h1>
          <p className="text-text-muted mt-2 max-w-xl mx-auto">
            Styled sets put together by us. Tap a look to shop every piece in it.
          </p>
        </div>

        {all.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {all.map((look) => (
              <LookCard key={look.id} look={look} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl">
            <p className="text-text-muted text-lg">No looks published yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
