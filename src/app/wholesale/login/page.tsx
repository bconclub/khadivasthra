"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWholesaleAuth } from "@/context/WholesaleAuthContext";
import { Button } from "@/components/ui/button";
import { AuthPortalHeader } from "@/components/auth/AuthPortalHeader";
import { Loader2 } from "lucide-react";

export default function WholesaleLoginPage() {
  const router = useRouter();
  const { signIn, user, loading } = useWholesaleAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    router.push("/wholesale");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.push("/wholesale");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream/30">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream/30 px-4 py-10">
      <div className="w-full max-w-sm">
        <AuthPortalHeader active="wholesale" subtitle="Wholesale Login" />

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
                placeholder="you@yourbusiness.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent"
                placeholder="Enter password"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full mt-6 h-12" disabled={submitting}>
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Signing in...</>
            ) : (
              "Sign In"
            )}
          </Button>

          <p className="text-sm text-gray-500 text-center mt-5">
            New to trade?{" "}
            <Link href="/wholesale/register" className="text-coral font-medium hover:underline">
              Apply for an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
