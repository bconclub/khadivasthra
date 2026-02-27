"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trackShipment } from "@/lib/services/orders";
import type { TrackingResult } from "@/types";
import { Loader2, Package, MapPin, Truck, CheckCircle2, Search } from "lucide-react";
import Link from "next/link";

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [tracking, setTracking] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;

    setLoading(true);
    setError("");
    setTracking(null);

    try {
      const result = await trackShipment(orderNumber.trim());
      setTracking(result);
    } catch {
      setError("Could not find order. Please check the order number and try again.");
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case "in_transit":
        return <Truck className="w-6 h-6 text-blue-500" />;
      case "picked_up":
        return <Package className="w-6 h-6 text-purple-500" />;
      default:
        return <Package className="w-6 h-6 text-orange" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "delivered":
        return "Delivered";
      case "in_transit":
        return "In Transit";
      case "picked_up":
        return "Picked Up";
      case "processing":
        return "Processing";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 max-w-2xl py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-text font-serif mb-2 text-center">
          Track Your Order
        </h1>
        <p className="text-text-muted text-center mb-8">
          Enter your order number to check delivery status
        </p>

        <form onSubmit={handleTrack} className="flex gap-3 mb-8">
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. KV-20260227-001"
            className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-coral focus:border-transparent text-lg"
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading || !orderNumber.trim()}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </Button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {tracking && (
          <div className="bg-white rounded-xl shadow-sm border border-cream/30 overflow-hidden">
            {/* Status header */}
            <div className="p-6 border-b border-cream/30">
              <div className="flex items-center gap-4">
                {statusIcon(tracking.status)}
                <div>
                  <h2 className="text-xl font-bold text-text">
                    {statusLabel(tracking.status)}
                  </h2>
                  <p className="text-text-muted text-sm">{tracking.current_status}</p>
                </div>
              </div>
              {tracking.etd && (
                <p className="text-sm text-text-muted mt-3">
                  Estimated delivery: <span className="font-medium text-text">{tracking.etd}</span>
                </p>
              )}
              {tracking.tracking_url && (
                <a
                  href={tracking.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-sm text-coral hover:underline"
                >
                  View on courier website
                </a>
              )}
            </div>

            {/* Tracking scans */}
            {tracking.scans.length > 0 && (
              <div className="p-6">
                <h3 className="font-semibold text-text mb-4">Shipment Activity</h3>
                <div className="space-y-4">
                  {tracking.scans.map((scan, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${i === 0 ? "bg-coral" : "bg-gray-300"}`} />
                        {i < tracking.scans.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium text-text">{scan.activity}</p>
                        <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                          {scan.location && (
                            <>
                              <MapPin className="w-3 h-3" />
                              <span>{scan.location}</span>
                            </>
                          )}
                          {scan.date && <span>{scan.date}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tracking.scans.length === 0 && tracking.status === "processing" && (
              <div className="p-6 text-center text-text-muted">
                <Package className="w-12 h-12 mx-auto mb-3 text-coral/30" />
                <p>Your order is being prepared. Tracking details will appear here once shipped.</p>
              </div>
            )}
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/shop" className="text-coral hover:underline text-sm">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
