// Human Node · Exposure Check engine (Vercel Function, Node.js runtime, Web-standard handler).
// The Exposure Check tab on humannode.io posts here: POST /api/check
// Requires env var PERPLEXITY_API_KEY in Vercel → Project → Settings → Environment Variables.

const SECTORS = ["Retail & E-commerce", "FMCG", "FinTech", "Banking", "Healthcare", "Legal", "Professional Services", "Technology & SaaS", "Insurance", "Asset Management", "Crypto & Digital Assets", "Pharma & Life Sciences", "Telecoms", "Energy & Utilities", "Manufacturing", "Automotive", "Logistics & Transport", "Aviation & Travel", "Hospitality", "Education", "Public Sector", "Charities & Non-profit", "Media & Entertainment", "Real Estate", "Defence & Aerospace"];

function allowedOrigins() {
  const list = (process.env.ALLOWED_ORIGINS || "https://humannode.io,https://www.humannode.io")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (process.env.VERCEL_URL) list.push(`https://${process.env.VERCEL_URL}`); // preview deployments
  return list;
}

// Best-effort limit per IP, per function instance. Add a Vercel Firewall rate-limit rule on /api/check for a hard limit.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > MAX_PER_WINDOW;
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function perplexity(prompt, recency = "month") {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: prompt }],
      search_recency_filter: recency,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins().includes(origin)) {
    return json({ error: { message: "Origin not allowed" } }, 403);
  }
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return json({ error: { message: "Too many requests" } }, 429);
  if (!process.env.PERPLEXITY_API_KEY) return json({ error: { message: "Check service not configured" } }, 503);

  try {
    const body = await request.json();
    const content = String(body.messages?.[0]?.content || "");
    const company = (content.match(/for "(.+?)"/)?.[1] || "").trim().slice(0, 100);
    const sector = content.match(/in the (.+?) sector/)?.[1] || "";
    if (!company || !SECTORS.includes(sector)) {
      return json({ error: { message: "Choose a listed sector and enter an organisation name." } }, 400);
    }
    const avg = 58;

    // Run OSINT and threat search in parallel
    const [osintText, threatText] = await Promise.all([
      perplexity(
        `Find real public information about ${company} (${sector}): named executives, email format, key business processes, recent news, digital footprint. Verified facts only, cite sources.`
      ),
      perplexity(
        `Real social engineering and fraud attacks against ${sector} companies in the last 90 days 2026. Specific TTPs, attack methods, documented incidents with losses. Cite sources.`
      ),
    ]);

    // Single synthesis call
    const report = await perplexity(
      `Using ONLY this verified data, return a JSON threat report. No markdown. Do not invent — say "Not publicly available" if missing.

COMPANY: ${osintText}
THREATS: ${threatText}

JSON format:
{"exposure_level":"HIGH","osint":[{"type":"Executive Exposure","detail":"finding","risk":"high"},{"type":"Decision Surface","detail":"finding","risk":"high"},{"type":"Attack Window","detail":"finding","risk":"medium"},{"type":"Digital Footprint","detail":"finding","risk":"medium"}],"methodology_vector":"real vector","methodology_sequence":[{"title":"t","detail":"d"},{"title":"t","detail":"d"},{"title":"t","detail":"d"},{"title":"t","detail":"d"}],"ai_evolution":"real 2026 data","narrative":"3 sentences how TTPs hit ${company}","most_exposed_role":"role","likely_outcome":"outcome with GBP figure","indicative_score":61,"sector_average":${avg},"risk_level":"MODERATE RISK","primary_vulnerability":"one sentence"}`
    );

    const s = report.indexOf("{"), e = report.lastIndexOf("}");
    if (s === -1) throw new Error("No JSON returned");
    const parsed = JSON.parse(report.slice(s, e + 1));

    return json({ content: [{ type: "text", text: JSON.stringify(parsed) }] }, 200);
  } catch (err) {
    return json({ error: { message: "Report generation failed" } }, 502);
  }
}
