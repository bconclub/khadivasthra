"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSettings } from "@/lib/services/settings";

type Block =
  | { type: "heading"; text: string }
  | { type: "note"; text: string }
  | { type: "list"; items: string[] };

// Admin edits these policies as plain text, one point per line. Short lines
// without closing punctuation are section headings, lines ending in ":" are
// notes, and everything else is grouped into bullet lists.
function parsePolicy(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.endsWith(":")) {
      blocks.push({ type: "note", text: line });
    } else if (line.length <= 60 && !/[.!?]$/.test(line)) {
      blocks.push({ type: "heading", text: line });
    } else {
      const last = blocks[blocks.length - 1];
      if (last?.type === "list") last.items.push(line);
      else blocks.push({ type: "list", items: [line] });
    }
  }
  return blocks;
}

function PolicySection({ id, text }: { id: string; text: string }) {
  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      {parsePolicy(text).map((block, i) => {
        if (block.type === "heading") {
          return (
            <h2 key={i} className="text-xl font-semibold text-gray-900 pt-4 first:pt-0">
              {block.text}
            </h2>
          );
        }
        if (block.type === "note") {
          return <p key={i} className="font-semibold text-gray-900">{block.text}</p>;
        }
        return (
          <ul key={i} className="list-disc pl-5 space-y-2">
            {block.items.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        );
      })}
    </section>
  );
}

export default function TermsPage() {
  const [policies, setPolicies] = useState<{ shipping: string; returns: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => setPolicies({ shipping: s?.shipping_info?.trim() || "", returns: s?.return_policy?.trim() || "" }))
      .catch(() => setFailed(true));
  }, []);

  const empty = policies && !policies.shipping && !policies.returns;

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 max-w-3xl py-12">
        <Link href="/" className="inline-flex items-center gap-1 text-coral hover:underline text-sm mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms & Conditions</h1>
        <p className="text-gray-500 mb-8">Khadi Vasthra</p>

        <p className="text-gray-700 leading-relaxed mb-8">
          By placing an order on the Khadi Vasthra website, customers agree to the following terms and
          conditions regarding purchases, delivery, returns, and refunds.
        </p>

        <div className="space-y-10 text-gray-700 leading-relaxed">
          {!policies && !failed && (
            <div className="space-y-3 animate-pulse">
              <div className="h-6 bg-gray-100 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded" />
              <div className="h-4 bg-gray-100 rounded w-5/6" />
            </div>
          )}

          {(failed || empty) && (
            <p>Our policies could not be loaded right now. Please contact us for details.</p>
          )}

          {policies?.shipping && <PolicySection id="shipping" text={policies.shipping} />}
          {policies?.returns && <PolicySection id="returns" text={policies.returns} />}

          <section className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-500">
              For any questions, please contact us at{" "}
              <a href="mailto:khadivastra1510@gmail.com" className="text-coral hover:underline">
                khadivastra1510@gmail.com
              </a>{" "}
              or call{" "}
              <a href="tel:+919847231512" className="text-coral hover:underline">
                +91 98472 31512
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
