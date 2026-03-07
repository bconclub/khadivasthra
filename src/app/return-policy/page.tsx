import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Order Confirmation</h2>
            <p>
              Once an order is placed, customers will receive an order confirmation message or email.
              Orders will be processed based on product availability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Shipping & Delivery</h2>
            <p>
              Khadi Vasthra ships products through trusted courier partners. Delivery timelines may
              vary depending on the destination and courier service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Returns for Damaged Products</h2>
            <p className="mb-3">
              We accept returns only if the product is damaged during transit. To claim a return,
              customers must follow these conditions:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Customers must record a <strong>clear opening/unboxing video</strong> while opening the parcel.</li>
              <li>If any damage or defect is found, customers must capture <strong>clear photos or videos</strong> showing the defect.</li>
              <li>The opening video and defect proof must be shared <strong>within 1 hour</strong> of receiving the parcel.</li>
              <li>Claims without a valid opening video or submitted after 1 hour of delivery will <strong>not be accepted</strong>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Verification Process</h2>
            <p>
              After receiving the proof, our team will review the submitted images or videos. If the claim
              is approved, Khadi Vasthra will proceed with a replacement or refund process.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Replacement Timeline</h2>
            <p>
              Approved replacement requests will be processed, and the replacement product will be shipped
              within <strong>7 working days</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Refund Policy</h2>
            <p>
              If a refund is approved instead of a replacement, the refund amount will be processed
              within <strong>7 working days</strong> to the original payment method.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Non-Returnable Conditions</h2>
            <p className="mb-3">Returns or replacements will not be accepted if:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>No opening/unboxing video is provided.</li>
              <li>The complaint is reported after 1 hour of delivery.</li>
              <li>The product damage appears to have occurred after delivery.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Policy Updates</h2>
            <p>
              Khadi Vasthra reserves the right to update or modify these terms and conditions at any time
              without prior notice.
            </p>
          </section>

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
