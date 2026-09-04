"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { registerAccount } from "@/lib/services/wholesale";
import { useWholesaleAuth } from "@/context/WholesaleAuthContext";
import { Button } from "@/components/ui/button";
import { AuthPortalHeader } from "@/components/auth/AuthPortalHeader";
import { Loader2, CheckCircle2 } from "lucide-react";

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export default function WholesaleRegisterPage() {
  const router = useRouter();
  const { refreshAccount } = useWholesaleAuth();

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gst, setGst] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;

      // With email confirmation switched on there is no session yet, so the
      // account row cannot be inserted under the buyer's own id. Say so plainly
      // instead of failing on an RLS error they cannot interpret.
      if (!data.session) {
        setDone(true);
        return;
      }

      await registerAccount({
        business_name: businessName,
        contact_name: contactName,
        phone,
        email,
        gst_number: gst || null,
        address,
        city,
        state,
        pincode,
      });
      await refreshAccount();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream/30 px-4 py-10">
        <div className="w-full max-w-md text-center">
          <AuthPortalHeader active="wholesale" subtitle="Wholesale" />
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-text mb-2">Application received</h1>
            <p className="text-text-muted text-sm leading-relaxed mb-6">
              Our team will review your details and approve the account. You will be able to see
              trade pricing and send enquiries as soon as that is done.
            </p>
            <Button variant="primary" size="lg" className="w-full" onClick={() => router.push("/wholesale")}>
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream/30 px-4 py-10">
      <div className="w-full max-w-lg mx-auto">
        <AuthPortalHeader active="wholesale" subtitle="Apply for a trade account" />

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Business name</label>
                <input type="text" required value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contact person</label>
                <input type="text" required value={contactName}
                  onChange={(e) => setContactName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" required value={phone}
                  onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>GST number <span className="text-gray-400">(optional)</span></label>
              <input type="text" value={gst} onChange={(e) => setGst(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <textarea rows={2} required value={address}
                onChange={(e) => setAddress(e.target.value)} className={`${inputClass} resize-none`} />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>City</label>
                <input type="text" required value={city}
                  onChange={(e) => setCity(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input type="text" required value={state}
                  onChange={(e) => setState(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Pincode</label>
                <input type="text" required value={pincode}
                  onChange={(e) => setPincode(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Choose a password</label>
              <input type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)} className={inputClass}
                placeholder="At least 6 characters" />
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full mt-6 h-12" disabled={submitting}>
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
            ) : (
              "Apply for a trade account"
            )}
          </Button>

          <p className="text-xs text-gray-400 text-center mt-4">
            Accounts are reviewed before trade pricing is unlocked.
          </p>
          <p className="text-sm text-gray-500 text-center mt-3">
            Already approved?{" "}
            <Link href="/wholesale/login" className="text-coral font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
