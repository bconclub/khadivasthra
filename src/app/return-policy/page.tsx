"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSettings } from "@/lib/services/settings";
import { DEFAULT_CANCELLATION_POLICY, GOVERNING_LAW } from "@/lib/policies";

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

type Business = { name: string; gstin: string; address: string; email: string; phone: string };

function BusinessSection({ business }: { business: Business }) {
  const rows: [string, string][] = [
    ["Legal name", business.name],
    ["GSTIN", business.gstin],
    ["Registered address", business.address],
    ["Email", business.email],
    ["Phone", business.phone],
  ];
  return (
    <section id="business" className="space-y-3 scroll-mt-24">
      <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>
      <p>This website is owned and operated by:</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-gray-500">{k}</dt>
            <dd className="text-gray-900 whitespace-pre-line">
              {k === "Email" ? <a href={`mailto:${v}`} className="text-coral hover:underline">{v}</a>
                : k === "Phone" ? <a href={`tel:${v.replace(/\s/g, "")}`} className="text-coral hover:underline">{v}</a>
                : v}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function TermsPage() {
  const [policies, setPolicies] = useState<{ shipping: string; returns: string; cancellation: string } | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setPolicies({
          shipping: s?.shipping_info?.trim() || "",
          returns: s?.return_policy?.trim() || "",
          // Fall back to the default only if no box already carries a
          // cancellation policy (it was first pasted into Return Policy).
          cancellation:
            s?.cancellation_policy?.trim() ||
            (/cancellation policy/i.test(`${s?.return_policy ?? ""} ${s?.shipping_info ?? ""}`) ? "" : DEFAULT_CANCELLATION_POLICY),
        });
        setBusiness({
          name: s?.legal_name?.trim() || s?.store_name || "Khadi Vasthra",
          gstin: s?.gstin?.trim() || "",
          address: s?.registered_address?.trim() || s?.store_address || "",
          email: s?.store_email || "",
          phone: s?.store_phone || "",
        });
      })
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 max-w-3xl py-12">
        <Link href="/" className="inline-flex items-center gap-1 text-coral hover:underline text-sm mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms & Conditions</h1>
        <p className="text-gray-500 mb-8">{business?.name || "Khadi Vasthra"}</p>

        <p className="text-gray-700 leading-relaxed mb-8">
          By placing an order on the Khadi Vasthra website, customers agree to the following terms and
          conditions regarding purchases, delivery, cancellations, returns, and refunds.
        </p>

        <div className="space-y-10 text-gray-700 leading-relaxed">
          {!policies && !failed && (
            <div className="space-y-3 animate-pulse">
              <div className="h-6 bg-gray-100 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded" />
              <div className="h-4 bg-gray-100 rounded w-5/6" />
            </div>
          )}

          {failed && (
            <p>Some of our policies could not be loaded right now. Please refresh, or contact us for details.</p>
          )}

          {policies?.shipping && <PolicySection id="shipping" text={policies.shipping} />}
          {policies?.returns && <PolicySection id="returns" text={policies.returns} />}
          {policies?.cancellation && <PolicySection id="cancellation" text={policies.cancellation} />}
          <PolicySection id="governing-law" text={GOVERNING_LAW} />
          {business && <BusinessSection business={business} />}
        </div>
      </div>
    </div>
  );
}
