// Fixed-IP relay for India Post and Easebuzz.
//
// Both gateways only accept API calls from whitelisted IPv4 addresses, and
// Supabase Edge Functions have no fixed outbound IP. The functions send each
// upstream call here instead; this server (on a static IP) makes the call and
// returns the response untouched.
//
// Only HTTPS calls to the hosts below are forwarded, and only for requests
// carrying the shared secret, so the relay cannot be used as an open proxy.
//
//   POST /relay   header x-relay-secret: <RELAY_SECRET>
//   body { "url": "...", "method": "POST", "headers": {...}, "body": "<string>" }
//   →   { "status": 200, "headers": {...}, "body": "<string>", "base64": false }
//
// No dependencies; runs on Node 18+.
import http from "node:http";
import { timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.PORT || 8080);
const SECRET = process.env.RELAY_SECRET || "";
const ALLOWED_HOSTS = (process.env.RELAY_ALLOWED_HOSTS ||
  "test.cept.gov.in,app.indiapost.gov.in,api.cept.gov.in,testpay.easebuzz.in,pay.easebuzz.in,testdashboard.easebuzz.in,dashboard.easebuzz.in")
  .split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
const MAX_BODY = 20 * 1024 * 1024; // bulk booking files can be a few MB
const TIMEOUT_MS = 30_000;

if (SECRET.length < 32) {
  console.error("RELAY_SECRET must be set to at least 32 characters");
  process.exit(1);
}

function secretOk(given) {
  const a = Buffer.from(String(given || ""));
  const b = Buffer.from(SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(res, status, obj) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error("body too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const TEXT_TYPES = /json|text|xml|x-www-form-urlencoded|javascript/i;

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
  if (req.method !== "POST" || req.url !== "/relay") return send(res, 404, { error: "not found" });
  if (!secretOk(req.headers["x-relay-secret"])) return send(res, 401, { error: "unauthorized" });

  let job;
  try {
    job = JSON.parse(await readBody(req));
  } catch {
    return send(res, 400, { error: "invalid JSON" });
  }

  let target;
  try {
    target = new URL(job.url);
  } catch {
    return send(res, 400, { error: "invalid url" });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.includes(target.hostname.toLowerCase())) {
    return send(res, 403, { error: `host not allowed: ${target.hostname}` });
  }

  const method = String(job.method || "GET").toUpperCase();
  const headers = { ...(job.headers || {}) };
  delete headers.host;
  delete headers["content-length"];

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : job.body ?? undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const type = upstream.headers.get("content-type") || "";
    const buf = Buffer.from(await upstream.arrayBuffer());
    const isText = TEXT_TYPES.test(type) || buf.length === 0;
    console.log(new Date().toISOString(), method, target.hostname + target.pathname, upstream.status);
    send(res, 200, {
      status: upstream.status,
      headers: Object.fromEntries(upstream.headers),
      body: isText ? buf.toString("utf8") : buf.toString("base64"),
      base64: !isText,
    });
  } catch (err) {
    console.error(new Date().toISOString(), method, target.hostname, "failed:", err?.message);
    send(res, 502, { error: "upstream request failed", detail: String(err?.message || err) });
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`relay listening on 127.0.0.1:${PORT}`));
