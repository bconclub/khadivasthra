// Sends gateway API calls through the fixed-IP relay (relay/server.mjs) when
// RELAY_URL and RELAY_SECRET are set, so India Post and Easebuzz see the one
// whitelisted IP. Without them it calls the API directly, which is what local
// testing and the pre-relay setup use.
//
// Secrets: RELAY_URL (e.g. https://relay.khadivasthra.com), RELAY_SECRET.
const RELAY_URL = (Deno.env.get("RELAY_URL") ?? "").replace(/\/+$/, "");
const RELAY_SECRET = Deno.env.get("RELAY_SECRET") ?? "";

export function relayEnabled(): boolean {
  return RELAY_URL.length > 0 && RELAY_SECRET.length > 0;
}

/** Drop-in for fetch() for upstream gateway calls. Body must be a string or URLSearchParams. */
export async function relayFetch(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string | URLSearchParams } = {},
): Promise<Response> {
  const body = init.body instanceof URLSearchParams ? init.body.toString() : init.body;
  if (!relayEnabled()) {
    return fetch(url, { method: init.method, headers: init.headers, body });
  }

  const res = await fetch(`${RELAY_URL}/relay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-relay-secret": RELAY_SECRET },
    body: JSON.stringify({ url, method: init.method ?? "GET", headers: init.headers ?? {}, body }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Relay error ${res.status}: ${detail.slice(0, 300)}`);
  }
  const out = await res.json() as { status: number; headers: Record<string, string>; body: string; base64: boolean };
  const bytes = out.base64 ? Uint8Array.from(atob(out.body), (c) => c.charCodeAt(0)) : out.body;
  // Response treats 1xx/204/304 specially; the gateways never send them here.
  return new Response(bytes, { status: out.status, headers: out.headers });
}
