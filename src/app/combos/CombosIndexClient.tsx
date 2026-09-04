"use client";

import Link from "next/link";
import Image from "next/image";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getCombos } from "@/lib/services/combos";
import { storageImage, IMG } from "@/lib/image";
import type { Combo } from "@/types";
import { Loader2 } from "lucide-react";

export default function CombosIndexClient() {
  const { data: combos, loading } = useSupabaseQuery(getCombos);
  const all = combos || [];

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
            Combos
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-text font-serif">Build your own set</h1>
          <p className="text-text-muted mt-2 max-w-xl mx-auto">
            One fixed price, your pick of the pieces.
          </p>
        </div>

        {all.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {all.map((combo) => (
              <ComboCard key={combo.id} combo={combo} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl">
            <p className="text-text-muted text-lg">No combos running right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Shared card used on the combos index and the homepage strip. */
export function ComboCard({ combo }: { combo: Combo }) {
  return (
    <Link href={`/combos/${combo.slug}`} className="group block">
      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-md bg-cream/50">
        {combo.image_url && (
          <Image
            src={storageImage(combo.image_url, IMG.card)}
            alt={combo.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover [@media(hover:hover)]:group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
          <h3 className="text-white font-bold text-sm md:text-lg leading-tight drop-shadow-md">
            {combo.name}
          </h3>
          <span className="inline-flex items-center gap-1 mt-1.5 text-white text-[11px] md:text-xs font-medium bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
            Any {combo.choose_count} for ₹{Number(combo.combo_price).toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </Link>
  );
}
