"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

interface AuthPortalHeaderProps {
  active: "admin" | "investor" | "wholesale";
  subtitle: string;
}

export function AuthPortalHeader({ active, subtitle }: AuthPortalHeaderProps) {
  const router = useRouter();

  return (
    <div className="text-center mb-8">
      <Image
        src="/KV Logo Colour.webp"
        alt="Khadi Vasthra"
        width={180}
        height={60}
        className="h-14 w-auto object-contain mx-auto mb-2"
        priority
      />
      <p className="text-gray-500 mt-2 mb-5">{subtitle}</p>

      {/* Trade buyers are customers, not staff — the wholesale portal does not
          advertise the admin and investor logins. */}
      <div className={`inline-flex bg-gray-100 rounded-full p-1 ${active === "wholesale" ? "hidden" : ""}`}>
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
