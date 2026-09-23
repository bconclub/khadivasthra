const durationSeconds = 30 * 24 * 60 * 60;

async function signature(id: string, phone: string, expiresAt: number) {
  const secret = Deno.env.get("KV_ORDER_LINK_SECRET");
  if (!secret || secret.length < 32) throw new Error("Order status links are not configured");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}:${phone}:${expiresAt}`));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function issueOrderToken(id: string, phone: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + durationSeconds;
  return `${expiresAt}.${await signature(id, phone, expiresAt)}`;
}

export async function verifyOrderToken(id: string, phone: string, token: unknown) {
  if (typeof token !== "string" || !/^\d{10}\.[a-f0-9]{64}$/i.test(token)) return false;
  const [expires, provided] = token.split(".");
  const expiresAt = Number(expires);
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt < now || expiresAt > now + durationSeconds) return false;
  return await signature(id, phone, expiresAt) === provided;
}
