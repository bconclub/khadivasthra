"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Loader2 } from "lucide-react";
import type { Order } from "@/types";

/** Pincode -> [lat, lng], built from the India Post (data.gov.in) pincode directory. */
type PinTable = Record<string, [number, number]>;
let pinTablePromise: Promise<PinTable> | null = null;
function loadPinTable(): Promise<PinTable> {
  if (!pinTablePromise) {
    pinTablePromise = fetch("/data/pincodes.json").then((r) => {
      if (!r.ok) throw new Error("pincode table " + r.status);
      return r.json();
    });
    pinTablePromise.catch(() => { pinTablePromise = null; });
  }
  return pinTablePromise;
}

interface PinStat {
  pincode: string;
  city: string;
  state: string;
  orders: number;
  revenue: number;
  at: [number, number] | null;
}

const titleCase = (s: string) => s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** Real orders only: abandoned carts (unpaid pending/cancelled) are left out, as on the stat cards. */
function isRealOrder(o: Order) {
  return !((o.status === "pending" || o.status === "cancelled") && o.payment_status !== "paid");
}

export function OrdersMap({ orders, loading }: { orders: Order[]; loading: boolean }) {
  const [pins, setPins] = useState<PinTable | null>(null);
  const [pinError, setPinError] = useState(false);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    loadPinTable().then(setPins).catch(() => setPinError(true));
  }, []);

  const stats = useMemo(() => {
    const byPin = new Map<string, PinStat & { cities: Map<string, number> }>();
    for (const o of orders) {
      if (!isRealOrder(o)) continue;
      const pincode = String(o.customer_pincode || "").replace(/\s/g, "");
      if (!/^\d{6}$/.test(pincode)) continue;
      let s = byPin.get(pincode);
      if (!s) {
        s = { pincode, city: "", state: o.customer_state ? titleCase(o.customer_state) : "", orders: 0, revenue: 0, at: null, cities: new Map() };
        byPin.set(pincode, s);
      }
      s.orders += 1;
      s.revenue += Number(o.total) || 0;
      const city = o.customer_city ? titleCase(o.customer_city) : "";
      if (city) s.cities.set(city, (s.cities.get(city) || 0) + 1);
    }
    const list: PinStat[] = [...byPin.values()].map(({ cities, ...s }) => ({
      ...s,
      city: [...cities.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "",
      at: pins?.[s.pincode] ?? null,
    }));
    list.sort((a, b) => b.orders - a.orders || b.revenue - a.revenue);

    // "TamilNadu", "Tamilnadu" and "Tamil Nadu" are one state; show the spaced spelling.
    const byState = new Map<string, { name: string; n: number }>();
    for (const s of list) {
      const name = s.state.replace(/\s+/g, " ").trim() || "Unknown";
      const key = name.toLowerCase().replace(/[^a-z]/g, "");
      const cur = byState.get(key);
      if (!cur) byState.set(key, { name, n: s.orders });
      else {
        cur.n += s.orders;
        if (name.split(" ").length > cur.name.split(" ").length) cur.name = name;
      }
    }
    const states = [...byState.values()].sort((a, b) => b.n - a.n).map((v) => [v.name, v.n] as const);
    const total = list.reduce((n, s) => n + s.orders, 0);
    const unmapped = pins ? list.filter((s) => !s.at).reduce((n, s) => n + s.orders, 0) : 0;
    return { list, states, total, unmapped };
  }, [orders, pins]);

  // Create the map once, in the browser only.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      const map = L.map(mapEl.current, { scrollWheelZoom: false, zoomSnap: 0.5 }).setView([20.6, 79], 4.5);
      const dark = document.documentElement.classList.contains("dark");
      L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png`, {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Draw a bubble per pincode, sized by its number of orders.
  useEffect(() => {
    if (!mapReady || !pins) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      const layer = layerRef.current;
      if (cancelled || !map || !layer) return;
      layer.clearLayers();
      const placed = stats.list.filter((s) => s.at);
      const max = Math.max(1, ...placed.map((s) => s.orders));
      // Smallest first so the busiest pincodes sit on top.
      for (const s of [...placed].reverse()) {
        const r = 4 + 16 * Math.sqrt(s.orders / max);
        L.circleMarker(s.at!, {
          radius: r,
          color: "#D64D6A",
          weight: 1,
          fillColor: "#E8657B",
          fillOpacity: 0.25 + 0.5 * (s.orders / max),
        })
          .bindTooltip(
            `<b>${s.pincode}</b>${s.city ? ` · ${s.city}` : ""}<br/>${s.orders} order${s.orders === 1 ? "" : "s"} · ₹${Math.round(s.revenue).toLocaleString("en-IN")}`,
            { direction: "top" }
          )
          .addTo(layer);
      }
      if (placed.length) {
        map.fitBounds(L.latLngBounds(placed.map((s) => s.at!)), { padding: [24, 24], maxZoom: 9 });
      }
    })();
    return () => { cancelled = true; };
  }, [mapReady, pins, stats]);

  const top = stats.list.slice(0, 8);
  const topMax = top[0]?.orders || 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-coral" /> Where orders come from
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {stats.total.toLocaleString()} orders from {stats.list.length.toLocaleString()} pincodes
          {stats.unmapped > 0 && ` · ${stats.unmapped} with an unknown pincode not shown`}
        </p>
      </div>
      <div className="grid lg:grid-cols-[1fr_300px]">
        <div className="relative">
          <div ref={mapEl} className="h-[360px] lg:h-[440px] w-full z-0" />
          {(loading || (!pins && !pinError)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-800/60 z-[500]">
              <Loader2 className="w-6 h-6 animate-spin text-coral" />
            </div>
          )}
          {pinError && (
            <div className="absolute inset-x-0 bottom-0 p-3 text-xs text-red-600 bg-white/90 dark:bg-gray-800/90 z-[500]">
              Couldn&apos;t load pincode locations. Reload to try again.
            </div>
          )}
        </div>
        <div className="border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-700 p-5 space-y-5">
          <div>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Top pincodes</h3>
            {top.length === 0 ? (
              <p className="text-sm text-gray-400">{loading ? "Loading…" : "No orders in this range"}</p>
            ) : (
              <ol className="space-y-2">
                {top.map((s) => (
                  <li key={s.pincode} className="text-sm">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs text-gray-900 dark:text-white">{s.pincode}</span>
                      <span className="text-gray-500 dark:text-gray-400 truncate flex-1">{s.city}</span>
                      <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{s.orders}</span>
                    </div>
                    <div className="h-1 mt-1 rounded-full bg-gray-100 dark:bg-gray-700">
                      <div className="h-1 rounded-full bg-coral" style={{ width: `${(s.orders / topMax) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {stats.states.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">By state</h3>
              <ul className="space-y-1">
                {stats.states.slice(0, 6).map(([state, n]) => (
                  <li key={state} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300 truncate">{state}</span>
                    <span className="text-gray-900 dark:text-white tabular-nums">
                      {n} <span className="text-gray-400 text-xs">({Math.round((n / stats.total) * 100)}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
