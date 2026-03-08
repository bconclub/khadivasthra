"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

const LOGOS = [
  "/logo_languages/Khaid Vasthra Logo-01.png", // Malayalam
  "/logo_languages/Khaid Vasthra Logo-02.png", // Tamil
  "/logo_languages/Khaid Vasthra Logo-03.png", // Telugu
  "/logo_languages/Khaid Vasthra Logo-04.png", // English
];

const DISPLAY_DURATION = 700;  // how long each logo is visible (ms)
const FADE_DURATION = 400;     // crossfade transition (ms)
const EXIT_DURATION = 900;     // final exit animation (ms)

export function Preloader() {
  const [active, setActive] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [skipPreloader, setSkipPreloader] = useState(false);

  // Check sessionStorage — only show once per session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const seen = sessionStorage.getItem("kv-preloader-seen");
      if (seen) {
        setSkipPreloader(true);
        setActive(false);
      }
    }
  }, []);

  const finishPreloader = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setActive(false);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("kv-preloader-seen", "1");
      }
    }, EXIT_DURATION);
  }, []);

  // Cycle through logos
  useEffect(() => {
    if (!active || skipPreloader) return;

    const timer = setTimeout(() => {
      if (currentIndex < LOGOS.length - 1) {
        setFading(true);
        setTimeout(() => {
          setCurrentIndex((i) => i + 1);
          setFading(false);
        }, FADE_DURATION);
      } else {
        // Last logo (English) — hold a moment then exit
        setTimeout(finishPreloader, 500);
      }
    }, DISPLAY_DURATION);

    return () => clearTimeout(timer);
  }, [active, currentIndex, skipPreloader, finishPreloader]);

  // Lock body scroll while preloader is active
  useEffect(() => {
    if (active && !skipPreloader) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [active, skipPreloader]);

  if (!active || skipPreloader) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all`}
      style={{
        background: "linear-gradient(135deg, #1a1410 0%, #2d1f14 50%, #1a1410 100%)",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.05)" : "scale(1)",
        transitionDuration: `${EXIT_DURATION}ms`,
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Subtle golden glow behind logo */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: 300,
          height: 300,
          background: "radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Spinning decorative rings */}
      <div className="absolute w-56 h-56 rounded-full border border-[#F5A623]/10 animate-[spin_8s_linear_infinite]" />
      <div className="absolute w-72 h-72 rounded-full border border-[#F5E6D3]/5 animate-[spin_12s_linear_infinite_reverse]" />

      {/* Logo container */}
      <div className="relative w-60 h-60 md:w-80 md:h-80 flex items-center justify-center">
        {LOGOS.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 flex items-center justify-center transition-all"
            style={{
              opacity: i === currentIndex && !fading ? 1 : 0,
              transform: i === currentIndex && !fading ? "scale(1)" : "scale(0.9)",
              transitionDuration: `${FADE_DURATION}ms`,
              transitionTimingFunction: "ease-in-out",
            }}
          >
            <Image
              src={src}
              alt="Khadi Vasthra"
              width={320}
              height={320}
              className="object-contain"
              style={{
                filter: "drop-shadow(0 0 30px rgba(245,166,35,0.15))",
              }}
              priority
              unoptimized
            />
          </div>
        ))}
      </div>

      {/* Progress dots at bottom */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2.5">
        {LOGOS.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === currentIndex ? 24 : 6,
              height: 6,
              backgroundColor: i === currentIndex ? "#F5A623" : "rgba(245,230,211,0.2)",
              boxShadow: i === currentIndex ? "0 0 12px rgba(245,166,35,0.4)" : "none",
            }}
          />
        ))}
      </div>

      {/* Subtle bottom text */}
      <p
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-xs tracking-[0.3em] uppercase"
        style={{ color: "rgba(245,230,211,0.3)" }}
      >
        Since 2007
      </p>
    </div>
  );
}
