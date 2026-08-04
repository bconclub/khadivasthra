"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause } from "lucide-react";

const STORAGE_KEY = "kv_checkout_music_off";

/**
 * Easter egg: a little Onam tune while the shopper is on checkout.
 *
 * Browsers block audio autoplay until the user has interacted with the page,
 * so we *try* to start and fall back to an inviting "tap to play" pill when
 * that's refused. If the shopper switches it off we remember that and don't
 * pester them again on later visits.
 */
export function CheckoutMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [dismissed, setDismissed] = useState(true); // assume off until we read storage

  useEffect(() => {
    const off = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
    setDismissed(off);
    if (off) return;

    // Try to autoplay; most browsers will refuse without a prior gesture, in
    // which case the button simply sits there waiting to be tapped.
    const el = audioRef.current;
    if (!el) return;
    el.volume = 0.35;
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      // An explicit pause means "don't play this for me" — remember it.
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
      setDismissed(true);
    } else {
      el.volume = 0.35;
      el.play().then(() => {
        setPlaying(true);
        setDismissed(false);
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      }).catch(() => { /* still blocked — leave as is */ });
    }
  };

  return (
    <>
      <audio ref={audioRef} src="/onam-mood.mp3" loop preload="none" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Turn music off" : "Play Onam music"}
        title={playing ? "Turn music off" : "Play a little Onam tune"}
        className={`checkout-music fixed right-4 bottom-20 md:bottom-6 z-40 flex items-center gap-2 rounded-full pl-3 pr-4 py-2.5 shadow-lg transition-all hover:-translate-y-0.5 ${
          playing
            ? "bg-orange text-white shadow-orange/30"
            : "bg-white text-text border border-orange/40 shadow-black/10"
        }`}
      >
        {playing ? (
          <>
            <span className="relative flex items-center justify-center w-5 h-5">
              <Pause className="w-4 h-4" />
              <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
            </span>
            <span className="text-xs font-semibold whitespace-nowrap">Onam vibes on</span>
          </>
        ) : (
          <>
            <Music className={`w-4 h-4 text-orange ${dismissed ? "" : "animate-pulse"}`} />
            <span className="text-xs font-semibold whitespace-nowrap">Play Onam tune</span>
          </>
        )}
      </button>
    </>
  );
}
