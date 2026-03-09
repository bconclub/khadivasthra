import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SHIPROCKET_EMAIL = Deno.env.get("SHIPROCKET_EMAIL")!;
const SHIPROCKET_PASSWORD = Deno.env.get("SHIPROCKET_PASSWORD")!;
const PICKUP_POSTCODE = "683579"; // Aluva, Kerala warehouse

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

async function getShiprocketToken(): Promise<string> {
  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: SHIPROCKET_EMAIL,
      password: SHIPROCKET_PASSWORD,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Shiprocket auth error:", err);
    throw new Error("Failed to authenticate with Shiprocket");
  }

  const data = await res.json();
  return data.token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { delivery_pincode, total_items = 1 } = await req.json();

    if (!delivery_pincode || delivery_pincode.length !== 6) {
      return new Response(
        JSON.stringify({ error: "Valid 6-digit delivery pincode is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = await getShiprocketToken();

    // Weight: 0.5kg per item
    const weight = Math.max(0.5, total_items * 0.5);

    // Check prepaid serviceability
    const prepaidParams = new URLSearchParams({
      pickup_postcode: PICKUP_POSTCODE,
      delivery_postcode: delivery_pincode,
      weight: weight.toString(),
      cod: "0",
    });

    const res = await fetch(
      `${SHIPROCKET_BASE}/courier/serviceability/?${prepaidParams}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Shiprocket serviceability error:", err);
      return new Response(
        JSON.stringify({
          available: false,
          rates: [],
          cheapest_rate: 0,
          fastest_etd: "",
          cod_available: false,
          cod_cheapest_rate: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await res.json();

    // Parse courier options from response
    const couriers =
      data?.data?.available_courier_companies || [];

    if (couriers.length === 0) {
      return new Response(
        JSON.stringify({
          available: false,
          rates: [],
          cheapest_rate: 0,
          fastest_etd: "",
          cod_available: false,
          cod_cheapest_rate: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const rates = couriers.map(
      (c: {
        courier_company_id: number;
        courier_name: string;
        rate: number;
        etd: string;
        estimated_delivery_days: string;
      }) => ({
        courier_company_id: c.courier_company_id,
        courier_name: c.courier_name,
        rate: c.rate,
        etd: c.etd || `${c.estimated_delivery_days} days`,
        estimated_delivery_days: parseInt(c.estimated_delivery_days) || 7,
      })
    );

    // Sort by rate to find cheapest
    rates.sort(
      (a: { rate: number }, b: { rate: number }) => a.rate - b.rate
    );

    // Find fastest
    const fastest = [...rates].sort(
      (
        a: { estimated_delivery_days: number },
        b: { estimated_delivery_days: number }
      ) => a.estimated_delivery_days - b.estimated_delivery_days
    )[0];

    // Also check COD serviceability
    let codAvailable = false;
    let codCheapestRate = 0;

    try {
      const codParams = new URLSearchParams({
        pickup_postcode: PICKUP_POSTCODE,
        delivery_postcode: delivery_pincode,
        weight: weight.toString(),
        cod: "1",
      });

      const codRes = await fetch(
        `${SHIPROCKET_BASE}/courier/serviceability/?${codParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (codRes.ok) {
        const codData = await codRes.json();
        const codCouriers = codData?.data?.available_courier_companies || [];
        if (codCouriers.length > 0) {
          codAvailable = true;
          const codRates = codCouriers.map((c: { rate: number }) => c.rate);
          codCheapestRate = Math.min(...codRates);
        }
      }
    } catch (codErr) {
      console.error("COD serviceability check error:", codErr);
    }

    return new Response(
      JSON.stringify({
        available: true,
        rates,
        cheapest_rate: rates[0].rate,
        fastest_etd: fastest.etd,
        cod_available: codAvailable,
        cod_cheapest_rate: codCheapestRate,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
