import type { Metadata } from "next";
import CombosIndexClient from "./CombosIndexClient";

export const metadata: Metadata = {
  title: "Combos | Khadi Vasthra",
  description:
    "Build your own set of Kerala handloom pieces for one fixed price.",
  alternates: { canonical: "https://khadivasthra.com/combos" },
};

export default function CombosPage() {
  return <CombosIndexClient />;
}
