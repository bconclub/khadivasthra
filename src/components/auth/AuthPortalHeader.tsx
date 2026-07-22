"use client";

import { useRouter } from "next/navigation";

interface AuthPortalHeaderProps {
  active: "admin" | "investor";
  subtitle: string;
}

export function AuthPortalHeader({ active, subtitle }: AuthPortalHeaderProps) {
  const router = useRouter();

  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold text-coral font-serif">Khadi Vasthra</h1>
      <p className="text-gray-500 mt-2 mb-5">{subtitle}</p>

      <div className="inline-flex bg-gray-100 rounded-full p-1">
        <button
          type="button"
          onClick={() => active !== "admin" && router.push("/admin/login")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            active === "admin" ? "bg-coral text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Admin Login
        </button>
        <button
          type="button"
          onClick={() => active !== "investor" && router.push("/investor/login")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            active === "investor" ? "bg-coral text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Investor Login
        </button>
      </div>
    </div>
  );
}
