"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause } from "lucide-react";

const STORAGE_KEY = "kv_checkout_music_off";
// Background ambience, not a performance — keep it well under the shopper's
// system volume so it never startles anyone mid-checkout.
const VOLUME = 0.18;

/**
 * Easter egg: a little Onam tune while the shopper is on checkout.
 *
 * Browsers block audio autoplay until the user has interacted with the page,
 * so we *try* to start and fall back to an inviting "tap to play" pill when
 * that's refused. Plays through once (no loop); switching it off is remembered
 * so it never nags again.
 */
export function CheckoutMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [invite, setInvite] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    let off = false;
    try { off = localStorage.getItem(STORAGE_KEY) === "1"; } catch { /* ignore */ }
    if (off) return;

    el.volume = VOLUME;
    el.play()
      .then(() => setPlaying(true))
      .catch(() => setInvite(true)); // autoplay blocked — nudge them to tap
  }, []);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      setInvite(false);
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    } else {
      el.volume = VOLUME;
      el.play().then(() => {
        setPlaying(true);
        setInvite(false);
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      }).catch(() => { /* still blocked */ });
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        preload="none"
        onEnded={() => setPlaying(false)}
      >
        <source src="/onam-mood.m4a" type="audio/mp4" />
      </audio>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Turn music off" : "Play Onam music"}
        title={playing ? "Turn music off" : "Play a little Onam tune"}
        className={`checkout-music inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-3 py-1.5 text-xs font-semibold transition-all flex-shrink-0 ${
          playing
            ? "bg-orange text-white shadow-sm shadow-orange/30"
            : `bg-white text-text border border-orange/40 ${invite ? "animate-pulse" : ""}`
        }`}
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5 text-orange" />}
        <span className="whitespace-nowrap">{playing ? "Onam vibes on" : "Play Onam tune"}</span>
      </button>
    </>
  );
}
