// Contact form delivery. Sends each request by email through Resend (https://resend.com).
// Env: RESEND_API_KEY (required), CONTACT_TO (required: the inbox that receives requests),
//      CONTACT_FROM (optional; default "Human Node <onboarding@resend.dev>", which can only deliver
//      to the Resend account owner's own address until humannode.io is verified in Resend).
// Not configured -> 503, and the page tells the visitor to call instead. Nothing is stored.

function allowedOrigins() {
  const list = (process.env.ALLOWED_ORIGINS || "https://humannode.io,https://www.humannode.io")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (process.env.VERCEL_URL) list.push(`https://${process.env.VERCEL_URL}`);
  return list;
}
const WINDOW_MS = 10 * 60 * 1000, MAX_PER_WINDOW = 3, hits = new Map();
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now); hits.set(ip, list); if (hits.size > 5000) hits.clear();
  return list.length > MAX_PER_WINDOW;
}
function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
const clean = (v, n) => String(v || "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, n);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins().includes(origin)) return json({ error: { message: "Origin not allowed" } }, 403);
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return json({ error: { message: "Too many requests. Please call instead." } }, 429);

  let b;
  try { b = await request.json(); } catch { return json({ error: { message: "Invalid request" } }, 400); }
  if (clean(b.website, 200)) return json({ ok: true }, 200); // honeypot: bots fill the hidden field
  const intent = clean(b.intent, 80), name = clean(b.name, 100), email = clean(b.email, 160),
    org = clean(b.organisation, 160), phone = clean(b.phone, 40), note = clean(b.note, 4000);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: { message: "Add your name and a valid work email." } }, 400);

  const key = process.env.RESEND_API_KEY, to = process.env.CONTACT_TO;
  if (!key || !to) return json({ error: { message: "Online requests are not switched on yet.", fallback: true } }, 503);

  const subject = `${intent || "Request"}${org ? " – " + org : ""}`.replace(/[\r\n]+/g, " ");
  const lines = [["Request", intent], ["Name", name], ["Email", email], ["Phone", phone], ["Organisation", org]];
  const text = lines.map(([k, v]) => `${k}: ${v || "—"}`).join("\n") + "\n\n" + (note || "");
  const html = `<table>${lines.map(([k, v]) => `<tr><td style="color:#667;padding-right:12px">${k}</td><td>${esc(v || "—")}</td></tr>`).join("")}</table><p style="white-space:pre-wrap">${esc(note)}</p>`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.CONTACT_FROM || "Human Node <onboarding@resend.dev>", to: to.split(",").map((s) => s.trim()), reply_to: email, subject: `[humannode.io] ${subject}`, text, html }),
    });
    if (!r.ok) return json({ error: { message: "Could not send right now.", fallback: true } }, 502);
    return json({ ok: true }, 200);
  } catch {
    return json({ error: { message: "Could not send right now.", fallback: true } }, 502);
  }
}
