import type { Metadata } from "next";
import LooksIndexClient from "./LooksIndexClient";

export const metadata: Metadata = {
  title: "Shop the Look | Khadi Vasthra",
  description:
    "Styled Kerala handloom looks from Khadi Vasthra - shop every piece in the outfit.",
  alternates: { canonical: "https://khadivasthra.com/looks" },
};

export default function LooksPage() {
  return <LooksIndexClient />;
}
