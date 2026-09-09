import type { Metadata } from "next";
import { Suspense } from "react";
import ComboRouter from "./ComboRouter";

export const metadata: Metadata = {
  title: "Combos | Khadi Vasthra",
  description:
    "Build your own set of Kerala handloom pieces for one fixed price.",
  alternates: { canonical: "https://khadivasthra.com/combos" },
};

export default function CombosPage() {
  return <Suspense fallback={<div className="min-h-screen bg-cream p-12 text-center">Loading combos...</div>}><ComboRouter /></Suspense>;
}
