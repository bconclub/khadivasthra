"use client";

import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getSettings } from "@/lib/services/settings";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ReturnPolicyPage() {
  const { data: settings, loading } = useSupabaseQuery(getSettings);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 max-w-3xl py-12">
        <Link href="/" className="inline-flex items-center gap-1 text-coral hover:underline text-sm mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Return & Refund Policy</h1>
        <p className="text-gray-500 mb-8">Khadi Vasthra</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-coral" />
          </div>
        ) : settings?.return_policy ? (
          <div className="prose prose-gray max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
            {settings.return_policy}
          </div>
        ) : (
          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Returns</h2>
              <p>
                We accept returns within <strong>7 days</strong> of delivery. To be eligible for a return,
                the item must be unused, unwashed, and in the same condition as received, with all original
                tags and packaging intact.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">How to Initiate a Return</h2>
              <p>
                To start a return, please contact us at{" "}
                <a href="mailto:khadivastra1510@gmail.com" className="text-coral hover:underline">
                  khadivastra1510@gmail.com
                </a>{" "}
                or call us at{" "}
                <a href="tel:+919847231512" className="text-coral hover:underline">
                  +91 98472 31512
                </a>{" "}
                with your order number and reason for return. We will provide you with return shipping instructions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Refunds</h2>
              <p>
                Once we receive and inspect the returned item, we will notify you of the approval or
                rejection of your refund. If approved, the refund will be processed to your original
                payment method within <strong>5-7 business days</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Exchanges</h2>
              <p>
                We offer exchanges for defective or damaged items. If you received a damaged product,
                please contact us within 48 hours of delivery with photos of the damage.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Non-Returnable Items</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Items that have been washed, worn, or altered</li>
                <li>Items without original tags and packaging</li>
                <li>Items returned after 7 days of delivery</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Shipping Costs</h2>
              <p>
                Return shipping costs are borne by the customer, unless the return is due to a defective
                or incorrect item sent by us.
              </p>
            </section>

            <section className="border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-500">
                For any questions about our return policy, please contact us at{" "}
                <a href="mailto:khadivastra1510@gmail.com" className="text-coral hover:underline">
                  khadivastra1510@gmail.com
                </a>
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
