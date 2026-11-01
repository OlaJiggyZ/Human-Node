// Human Node · Exposure Check engine (Vercel Function, Node.js runtime, Web-standard handler).
// POST /api/check  { sector, organisation, domain }
//
// Evidence, in order of weight:
//   1. Public DNS records for the domain (DMARC, SPF, MX), read at run time via DNS-over-HTTPS.
//   2. Public web facts about the organisation (Perplexity search), each kept only with a cited source.
//   3. 2026 incidents for the sector, from the Human Node breach log (curated below, each with a source).
// Ratings are rules-based. Nothing is scored by a language model. Thin evidence returns "insufficient evidence".
//
// Env: PERPLEXITY_API_KEY (optional; without it the debrief runs on DNS and sector evidence only).

const SECTOR_INTEL = {
  incidents: {
    asos: ["ASOS · Oct 2026", "An attacker impersonated a trusted contact, took an employee's login and messaged customers through the company's own app.", "Trusted-channel abuse", "https://techcrunch.com/2026/10/08/asos-confirms-breach-of-customer-data-after-hackers-send-rogue-app-notification/"],
    levi: ["Levi Strauss · Aug 2026", "Three employees were socially engineered; corporate data was taken.", "Employee social engineering", "https://bleepingcomputer.com/news/security/levi-strauss-and-co-says-hackers-stole-corporate-data-in-cyberattack"],
    booking: ["Booking.com · Apr 2026", "Guest reservation data exposed; reporting points to compromised hotel partners.", "Partner compromise", "https://www.helpnetsecurity.com/2026/04/14/booking-com-data-breach/"],
    panera: ["Panera Bread · Jan 2026", "Live-call phishing of single sign-on users; 5.1M accounts leaked.", "Impersonation call", "https://www.bleepingcomputer.com/news/security/panera-bread-data-breach-impacts-51-million-accounts-not-14-million-customers/"],
    fr_super: ["French supermarkets · Oct 2026", "Internet-exposed refrigeration panels were hit across hundreds of stores; stock was destroyed.", "Exposed supplier equipment", "https://aljazeera.com/news/2026/10/13/unprecedented-cyberattack-hits-french-supermarkets-causing-food-losses"],
    brevo: ["Trezor via Brevo · Sep 2026", "Attackers used the brand's own newsletter platform to phish 347,149 contacts.", "Trusted-channel abuse", "https://trezor.io/blog/news/security-incident-at-brevo-our-third-party-email-provider"],
    revolut: ["Revolut · Sep 2026", "Fake data requests from a genuine government email domain led to customer ID documents being released.", "Official-request impersonation", "https://techcrunch.com/2026/09/12/revolut-confirms-customer-data-breach-through-fake-government-requests/"],
    figure: ["Figure · Feb 2026", "An employee was socially engineered through single sign-on; nearly 1M customer records reported.", "Impersonation and SSO", "https://securityaffairs.com/187988/data-breach/fintech-firm-figure-disclosed-data-breach-after-employee-phishing-attack.html"],
    bridgepay: ["BridgePay · Feb 2026", "Ransomware took card processing offline nationwide.", "Ransomware", "https://www.bleepingcomputer.com/news/security/payments-platform-bridgepay-confirms-ransomware-attack-behind-outage/"],
    fideuram: ["Fideuram · Sep 2026", "A WhatsApp message posing as the group CEO, then a cloned voice; about €95M wired.", "Executive deepfake", "https://live.euronext.com/en/financial-news/ai-messaging-scam-costs-italys-top-bank-intesa-millions-sources-say"],
    korea: ["Korean banks · Oct 2026", "An AI attack framework exploited customer-facing apps; about 25,000 Shinhan customers exposed.", "AI-run intrusion", "https://www.koreaherald.com/article/10892290"],
    mckesson: ["McKesson · Aug 2026", "Attackers claim calls to staff, then single sign-on takeover and SaaS data theft.", "Impersonation call", "https://www.helpnetsecurity.com/2026/08/31/healthcare-company-mckesson-data-breach/"],
    veradigm: ["Veradigm · Sep 2026", "Vendor credentials were used against a company API; patient data downloaded.", "Supplier credential", "https://www.sec.gov/Archives/edgar/data/0001124804/000119312526385249/mdrx-20260908.htm"],
    esneft: ["ESNEFT (NHS) · Sep 2026", "Staff viewed a patient's records without cause; ten removed or suspended.", "Insider misuse", "https://www.expressandstar.com/uk-news/nhs-trust-removes-10-people-amid-concerns-over-noah-woods-data-breach-9195267"],
    jonesday: ["Jones Day · Apr 2026", "Phishing by a group known for fake IT callbacks; files for 10 clients leaked.", "Callback phishing", "https://www.insurancejournal.com/news/national/2026/04/07/864660.htm"],
    fbi_law: ["FBI alert on US law firms · May 2026", "Fake IT callbacks, remote-access requests, then in-person visits posing as IT.", "Impersonation call", "https://www.ic3.gov/CSA/2026/260526.pdf"],
    prey: ["Help-desk vishing campaign · Sep 2026", "Callers posing as IT steered executives to fake Microsoft 365 logins; data stolen without malware.", "Impersonation call", "https://www.blackberry.com/en/secure-communications/security-briefing-center/fake-help-desk-calls-target-executives-in-microsoft-365-data-theft-and-extortion-campaign"],
    schwyz: ["Swiss business owner · Jan 2026", "Two weeks of calls from a cloned business partner's voice; several million francs lost.", "Voice clone", "https://www.srf.ch/news/schweiz/mittels-ki-zu-millionenbetrug-kriminelle-prellen-schwyzer-unternehmer-um-mehrere-millionen"],
    vercel: ["Vercel · Apr 2026", "A compromised AI tool's Google Workspace access led into internal systems.", "Connected AI tool", "https://www.csoonline.com/article/4160853/hackers-exploit-vercels-trust-in-ai-integration.html"],
    klue: ["Klue → LastPass · Jun 2026", "Integration tokens stolen from one SaaS vendor exposed several customers' CRM data.", "Supplier token", "https://bleepingcomputer.com/news/security/lastpass-confirms-data-breach-in-klue-supply-chain-attack"],
    ringcentral: ["RingCentral · Jul 2026", "Attackers say one phone call to an employee produced a password; 1.6M emails leaked.", "Impersonation call", "https://thenextweb.com/news/shinyhunters-ringcentral-leak-voice-phishing-ey"],
    connectwise: ["ConnectWise · Oct 2026", "AI-driven password spraying and vendor app credentials hit 2,250+ Microsoft 365 tenants.", "Supplier credential and AI", "https://www.microsoft.com/en-us/security/blog/2026/10/21/storm-0940-uses-artex-agentic-ai-connectwise-supply-chain-compromise/"],
    hedge: ["Point72, Two Sigma and others · Aug 2026", "Calls imitating known voices were used to obtain credentials.", "Impersonation call", "https://claimsjournal.com/news/national/2026/08/06/339326.htm"],
    apollo: ["Apollo · Aug 2026", "A social engineering incident; personal data including SSNs taken.", "Employee social engineering", "https://cyberscoop.com/apollo-discloses-data-breach-social-engineering-attack/"],
    binance: ["Binance · Oct 2026", "An engineer's compromised laptop reached a trusted internal service; about $6.3B left in about 20 minutes.", "Internal trust", "https://techcrunch.com/2026/10/29/binance-pauses-withdrawals-as-hackers-suspected-of-stealing-billions-in-crypto/"],
    drift: ["Drift Protocol · Apr 2026", "Six months posing as a trading firm, then a malicious repository; about $285M drained.", "Fake relationship", "https://thehackernews.com/2026/04/drift-loses-285-million-in-durable.html"],
    novo: ["Novo Nordisk · Jun 2026", "Internal systems accessed, including clinical-trial personal data; extortion followed.", "Extortion", "https://www.claimsjournal.com/news/national/2026/06/17/338266.htm"],
    stryker: ["Stryker · Mar 2026", "A compromised admin account wiped about 80,000 devices; no malware used.", "Admin account takeover", "https://securityaffairs.com/189535/hacking/attack-on-stryker-s-microsoft-environment-wiped-employee-devices-without-malware.html"],
    odido: ["Odido · Feb 2026", "Staff were phished, then called by fake IT to approve the login; 6.2M customers affected.", "Impersonation call", "https://www.techzine.eu/news/security/138787/major-hack-of-dutch-telco-odido-was-a-classic-case-of-social-engineering"],
    charter: ["Charter · May 2026", "Attackers claim a call to an employee led to CRM data export.", "Impersonation call", "https://www.bleepingcomputer.com/news/security/charter-confirms-data-breach-after-shinyhunters-extortion-threat/"],
    kddi: ["KDDI · Jul 2026", "Flaws in third-party email software exposed 12.2M addresses.", "Supplier software", "https://english.adnkronos.com/2026/07/07/12-m-email-addresses-7-m-passwords-breached-in-kddi-cyberattack/"],
    poland: ["Polish energy sites · Jan 2026", "Internet-exposed firewalls without MFA were used to wipe and reset 30+ sites.", "Exposed edge device", "https://www.helpnetsecurity.com/2026/02/06/poland-cyberattacks-energy-sector-industrial-organizations/"],
    water: ["Minnesota water utilities · Jul 2026", "Internet-exposed controllers with weak passwords; operators locked out.", "Exposed equipment", "https://securityaffairs.com/196453/ics-scada/cisa-urges-utilities-to-remove-internet-exposed-plcs-after-minnesota-attacks.html"],
    centerpoint: ["CenterPoint Energy · Sep 2026", "Personal data on 1M+ Texans exposed through an external system.", "External system", "https://securityaffairs.com/199170/data-breach/texas-utility-centerpoint-energy-confirms-data-breach-after-hacker-claims-7-49m-records-stolen.html"],
    foxconn: ["Foxconn · May 2026", "Ransomware hit North American factories.", "Ransomware", "https://bleepingcomputer.com/news/security/electronics-giant-foxconn-confirms-cyberattack-on-north-american-factories"],
    stadler: ["Stadler Rail · Jul 2026", "A supplier data-exchange login was used to steal technical data; CHF 10M demanded.", "Supplier credential", "https://www.teiss.co.uk/news/stadler-rail-confirms-cyberattack-refuses-123-million-ransom-demand-from-everest-hackers-17875"],
    panasonic: ["Panasonic · Oct 2026", "An employee uploaded HR data on 334,000 people to a banned AI service.", "Shadow AI", "https://smartscope.blog/en/blog/panasonic-generative-ai-data-leak-scope-330-000-2026/"],
    ceva: ["CEVA Logistics · Jul 2026", "Eight warehouses disrupted; client brands' customer data exposed.", "Supplier disruption", "https://securityaffairs.com/197086/data-breach/ceva-logistics-cyberattack-disrupts-european-warehouses-and-shipments.html"],
    amtrak: ["Amtrak · Apr 2026", "Customer-management data for 2.1M accounts leaked.", "Cloud CRM", "https://haveibeenpwned.com/Breach/Amtrak"],
    mag: ["Manchester Airports Group · Aug 2026", "Booking systems breached; contact data for about 8.7M customers exposed.", "Customer systems", "https://therecord.media/cyberattack-on-manchester-airports-group-exposes-millions-customer-info"],
    carnival: ["Carnival · May 2026", "An employee was tricked into granting access; about 6M people notified.", "Employee social engineering", "https://www.malwarebytes.com/blog/news/2026/05/carnival-confirms-data-breach-impacting-nearly-6-million"],
    keio: ["Keio Corporation · Sep 2026", "Ransomware disrupted business systems and hotel reservations.", "Ransomware", "https://securityaffairs.com/200027/data-breach/japanese-railway-operators-keio-corporation-and-tokyo-metro-disclose-security-breaches.html"],
    instructure: ["Instructure (Canvas) · May 2026", "Login pages were replaced with a ransom note during exams.", "Platform compromise", "https://www.instructure.com/incident_update"],
    peoplesoft: ["Oracle PeopleSoft campaign · Jun 2026", "A zero-day hit 100+ organisations, mostly universities.", "Supplier software", "https://helpnetsecurity.com/2026/06/11/oracle-peoplesoft-under-attack-cve-2026-35273/"],
    php2shell: ["UK school websites · Oct 2026", "A newly disclosed web-runtime flaw took a primary school's parent communications offline.", "Website flaw", "https://www.lynnnews.co.uk/news/primary-school-shuts-as-serious-cyber-security-threat-pose-9488276/"],
    aurora: ["City of Aurora · May 2026", "A call posing as the city's bank led to nearly $1.1M leaving payroll, despite phishing training.", "Impersonation call", "https://www.govtech.com/security/social-engineering-fraud-cost-aurora-ill-nearly-1-1m"],
    companies_house: ["Companies House · Mar 2026", "A login flaw exposed directors' home addresses.", "Application flaw", "https://www.theregister.com/2026/03/16/companies_house_breach/"],
    dfe: ["UK Department for Education · Jul 2026", "Help-desk portal data stolen; ransom refused.", "Extortion", "https://therecord.media/united-kingdom-ransomware-education"],
    beacon: ["Beacon CRM · Jul 2026", "An exposed cloud key gave access to supporter data for about 1,500 UK charities.", "Supplier credential", "https://www.infosecurity-magazine.com/news/exposed-aws-key-data-charities/"],
    biobank: ["UK Biobank · Apr 2026", "Data shared with approved researchers surfaced for sale.", "Insider misuse", "https://www.thenationalnews.com/news/uk/2026/04/23/half-a-million-uk-biobank-volunteers-medical-information-leaked/"],
    instagram: ["Instagram · Jun 2026", "Meta's AI support assistant was talked into sending password resets; 20,225 accounts taken.", "AI agent abuse", "https://www.helpnetsecurity.com/2026/06/08/instagram-ai-support-vulnerability-account-takeovers/"],
    anodot: ["Anodot → Rockstar and others · Apr 2026", "Tokens stolen from one analytics vendor reached a dozen companies' data.", "Supplier token", "https://techcrunch.com/2026/04/13/hack-at-anodot-leaves-over-a-dozen-breached-companies-facing-extortion/"],
    srilanka: ["Sri Lanka Treasury · Apr 2026", "Manipulated communications diverted $2.5M of debt repayments.", "Payment diversion", "https://www.ft.lk/top-story/CoPF-says-2-5-m-stolen-via-10-transactions-ignoring-red-flags/26-791360"],
    dmdc: ["US Defense Manpower Data Center · Sep 2026", "A file-sharing server flaw exposed 2.76M personnel records over nine months.", "Server flaw", "https://securityaffairs.com/200017/uncategorized/three-million-affected-in-pentagon-personnel-agency-data-breach.html"],
  },
  sectors: {
    "Retail & E-commerce": ["Retail breaches in 2026 ran through staff impersonation and the platforms brands use to reach customers.", ["asos", "levi", "booking"]],
    "FMCG": ["Consumer brands were reached through sign-on phishing, their own marketing platforms and exposed supplier equipment.", ["panera", "brevo", "fr_super"]],
    "FinTech": ["FinTech losses came from people, not code: fake official requests and socially engineered staff.", ["revolut", "figure", "bridgepay"]],
    "Banking": ["Banks lost the most through authority: a cloned executive voice, fake official requests and AI-run attacks on customer apps.", ["fideuram", "korea", "revolut"]],
    "Healthcare": ["Healthcare was reached through calls to staff, supplier credentials and insiders.", ["mckesson", "veradigm", "esneft"]],
    "Legal": ["Law firms were targeted by fake IT callbacks, remote-access requests and in-person visits posing as IT.", ["jonesday", "fbi_law", "prey"]],
    "Professional Services": ["Professional firms were hit by help-desk impersonation and voice-cloned partners.", ["prey", "fbi_law", "schwyz"]],
    "Technology & SaaS": ["Technology firms were breached through connected AI tools, stolen integration tokens and calls to staff.", ["vercel", "klue", "ringcentral"]],
    "Insurance": ["Insurers sit inside the same help-desk impersonation campaigns as legal and finance, and inherit supplier compromises.", ["fbi_law", "prey", "connectwise"]],
    "Asset Management": ["Funds were targeted with imitated voices and social engineering of staff with cloud access.", ["hedge", "apollo", "fideuram"]],
    "Crypto & Digital Assets": ["Crypto losses came from trusted internal systems, long-con relationships and the firm's own channels.", ["binance", "drift", "brevo"]],
    "Pharma & Life Sciences": ["Life sciences faced extortion, admin-account takeover and help-desk impersonation.", ["novo", "stryker", "prey"]],
    "Telecoms": ["Telecoms were breached by calls to customer-service staff and flaws in supplier software.", ["odido", "charter", "kddi"]],
    "Energy & Utilities": ["Energy and utilities were hit through internet-exposed equipment and external systems.", ["poland", "water", "centerpoint"]],
    "Manufacturing": ["Manufacturers faced ransomware, supplier-portal credentials and staff leaking data into AI tools.", ["foxconn", "stadler", "panasonic"]],
    "Automotive": ["Automotive supply chains share the patterns seen across manufacturing: supplier credentials, vendor apps and help-desk calls.", ["stadler", "connectwise", "prey"]],
    "Logistics & Transport": ["Logistics and transport were disrupted through warehouses, customer systems and supplier logins.", ["ceva", "amtrak", "stadler"]],
    "Aviation & Travel": ["Travel firms lost customer data through booking systems, staff social engineering and partners.", ["mag", "carnival", "booking"]],
    "Hospitality": ["Hospitality was reached through property partners, staff social engineering and ransomware.", ["booking", "carnival", "keio"]],
    "Education": ["Education was hit through shared platforms and supplier software used by thousands of institutions.", ["instructure", "peoplesoft", "php2shell"]],
    "Public Sector": ["Public bodies lost money to impersonation calls and data through application flaws and help-desk portals.", ["aurora", "companies_house", "dfe"]],
    "Charities & Non-profit": ["Charities were exposed through shared CRM suppliers and trusted data access.", ["beacon", "biobank", "aurora"]],
    "Media & Entertainment": ["Media brands were reached through AI support tools, analytics vendors and logistics partners.", ["instagram", "anodot", "ceva"]],
    "Real Estate": ["Property firms face help-desk impersonation and payment diversion on high-value transfers.", ["prey", "srilanka", "schwyz"]],
    "Defence & Aerospace": ["Defence organisations were exposed through long-lived server flaws and supplier credentials.", ["dmdc", "stadler", "connectwise"]],
  },
};
const SECTORS = Object.keys(SECTOR_INTEL.sectors);

function allowedOrigins() {
  const list = (process.env.ALLOWED_ORIGINS || "https://humannode.io,https://www.humannode.io")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (process.env.VERCEL_URL) list.push(`https://${process.env.VERCEL_URL}`);
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
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

export function normaliseDomain(raw) {
  let d = String(raw || "").trim().toLowerCase();
  if (!d) return "";
  d = d.replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[\/?#:]/)[0];
  return /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(d) ? d : null;
}

// ---------- 1. DNS evidence ----------
async function dns(name, type) {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error("dns");
  const j = await res.json();
  return { status: j.Status, answers: (j.Answer || []).filter((a) => a.type === (type === "TXT" ? 16 : 15)).map((a) => String(a.data)) };
}
const txt = (s) => s.replace(/"\s+"/g, "").replace(/^"|"$/g, "");

function mailProvider(mx) {
  const all = mx.join(" ").toLowerCase();
  if (/google\.com|googlemail\.com/.test(all)) return "Google Workspace";
  if (/outlook\.com|microsoft\.com/.test(all)) return "Microsoft 365";
  if (/pphosted\.com/.test(all)) return "Proofpoint (mail filter)";
  if (/mimecast\.com/.test(all)) return "Mimecast (mail filter)";
  if (/zoho\./.test(all)) return "Zoho Mail";
  return mx.length ? "Self-hosted or other provider" : "";
}

export async function dnsEvidence(domain) {
  const out = { ok: false, findings: [], controls: [], records: {} };
  try {
    const [mxR, spfR, dmarcR] = await Promise.all([dns(domain, "MX"), dns(domain, "TXT"), dns(`_dmarc.${domain}`, "TXT")]);
    out.ok = true;
    const mx = mxR.answers.map((a) => a.split(" ").pop().replace(/\.$/, ""));
    const spf = spfR.answers.map(txt).find((t) => /^v=spf1/i.test(t)) || "";
    const dmarc = dmarcR.answers.map(txt).find((t) => /^v=dmarc1/i.test(t)) || "";
    out.records = { mx, spf, dmarc };
    const ev = (label, value) => ({ text: `${label}: ${value || "no record"}`, url: null });

    if (!mx.length && mxR.status !== 0) { out.ok = false; return out; }

    const p = (dmarc.match(/;\s*p\s*=\s*(\w+)/i) || [])[1];
    if (!dmarc) out.findings.push({ id: "dmarc_missing", severity: "high", title: "No email spoofing protection (DMARC)", implication: `Anyone can send email that appears to come from @${domain}: to staff, customers and suppliers.`, evidence: [ev(`_dmarc.${domain}`, "")] });
    else if (/^none$/i.test(p || "")) out.findings.push({ id: "dmarc_none", severity: "medium", title: "Email spoofing is monitored, not blocked", implication: `DMARC is set to monitor only (p=none). Spoofed @${domain} email still reaches inboxes.`, evidence: [ev(`_dmarc.${domain}`, dmarc)] });
    else out.controls.push({ title: `DMARC enforced (p=${p})`, evidence: [ev(`_dmarc.${domain}`, dmarc)] });

    if (!spf) out.findings.push({ id: "spf_missing", severity: "medium", title: "No sender policy (SPF)", implication: "Receiving servers cannot check which systems may send your email.", evidence: [ev(domain + " TXT", "")] });
    else if (/[+?]all\b/i.test(spf)) out.findings.push({ id: "spf_weak", severity: /\+all/i.test(spf) ? "high" : "medium", title: "Sender policy allows any server", implication: "Your SPF record does not reject unauthorised senders.", evidence: [ev("SPF", spf)] });
    else out.controls.push({ title: "Sender policy (SPF) published", evidence: [ev("SPF", spf)] });

    const prov = mailProvider(mx);
    if (prov) out.findings.push({ id: "mail_platform", severity: "low", provider: prov, title: `Staff sign in through ${prov}`, implication: `${prov} accounts were the target of 2026's help-desk impersonation calls and single sign-on takeovers. Reset procedures decide whether a phone call is enough.`, evidence: [{ text: `MX: ${mx.slice(0, 3).join(", ")}`, url: null }] });
  } catch (e) { out.ok = false; }
  return out;
}

// ---------- 2. Public web facts (cited) ----------
const AREAS = {
  "Leadership": { id: "leaders", severity: "medium", title: "Named leaders are publicly identifiable", implication: "Named executives are the voices and names used in 2026's impersonation calls and deepfake payment requests." },
  "Email format": { id: "email_format", severity: "medium", title: "Staff email addresses are predictable", implication: "A public email pattern lets an attacker address any employee directly." },
  "Suppliers and platforms": { id: "platforms", severity: "medium", title: "Platforms and suppliers are publicly identifiable", implication: "Knowing which platforms you run tells an attacker which logins, vendors and support desks to impersonate." },
  "Customer channels": { id: "channels", severity: "medium", title: "Customer channels can be identified", implication: "Email, SMS and app channels that reach customers were turned against them in 2026." },
  "Recent events": { id: "events", severity: "low", title: "Recent changes provide pretexts", implication: "New systems, leadership moves and announcements give attackers believable reasons to call." },
  "Hiring and roles": { id: "hiring", severity: "low", title: "Job posts reveal systems and roles", implication: "Job adverts show tools in use and who handles payments, access and IT." },
};

async function perplexity(prompt) {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` },
    body: JSON.stringify({ model: "sonar", temperature: 0, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(40000),
  });
  const data = await res.json();
  const cites = (data.citations || (data.search_results || []).map((r) => r.url) || []).filter(Boolean);
  return { content: data.choices?.[0]?.message?.content || "", citations: cites };
}

const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

export async function webEvidence(org, domain, sector) {
  if (!process.env.PERPLEXITY_API_KEY) return { ran: false, matched: false, facts: [] };
  const prompt = `Search the public web for the organisation "${org}"${domain ? ` (website ${domain})` : ""} in the ${sector} sector.
Return only a JSON object, no markdown:
{"matched": true or false, "facts": [{"area": one of ${JSON.stringify(Object.keys(AREAS))}, "fact": "one factual sentence", "source": "the URL where you found it"}]}
Rules: include only facts stated in a source you found. Every fact must have its source URL. No estimates, no scores, no assumptions, no advice.
If you cannot identify this specific organisation with confidence, return {"matched": false, "facts": []}. At most 8 facts.`;
  try {
    const { content, citations } = await perplexity(prompt);
    const s = content.indexOf("{"), e = content.lastIndexOf("}");
    if (s < 0) return { ran: true, matched: false, facts: [] };
    const parsed = JSON.parse(content.slice(s, e + 1));
    if (!parsed.matched) return { ran: true, matched: false, facts: [] };
    const citeHosts = new Set(citations.map(host));
    const facts = (Array.isArray(parsed.facts) ? parsed.facts : [])
      .filter((f) => f && AREAS[f.area] && typeof f.fact === "string" && /^https?:\/\//.test(f.source || ""))
      .filter((f) => citations.includes(f.source) || citeHosts.has(host(f.source)) || (domain && host(f.source).endsWith(domain)))
      .slice(0, 8)
      .map((f) => ({ area: f.area, fact: f.fact.slice(0, 280), source: f.source }));
    return { ran: true, matched: facts.length > 0, facts };
  } catch (e) { return { ran: true, matched: false, facts: [] }; }
}

// ---------- 3. Assembly (rules-based) ----------
const ACTIONS = {
  dmarc_missing: ["Publish a DMARC record at p=none, review reports for two weeks, then enforce p=quarantine.", "Days", "IT"],
  dmarc_none: ["Move DMARC from monitoring to p=quarantine, then p=reject.", "Days", "IT"],
  spf_missing: ["Publish an SPF record listing every system that sends your email, ending in -all or ~all.", "Hours", "IT"],
  spf_weak: ["Replace the permissive SPF ending with -all or ~all.", "Hours", "IT"],
  mail_platform: ["Require identity verification beyond a phone call for every password reset and MFA change.", "Days", "IT and help desk"],
  leaders: ["Agree a call-back rule for any payment or access request that appears to come from a named leader.", "Hours", "Leadership and finance"],
  email_format: ["Set a verify-the-request rule for payment, password and access requests received by email or phone.", "Days", "Finance and support"],
  platforms: ["Enforce MFA and review connected apps on every public-facing platform; remove unused integrations.", "Days", "IT"],
  channels: ["Restrict who can send from email, SMS and push platforms; alert on new senders and bulk exports.", "Days", "Marketing and IT"],
  events: ["Brief staff that current news will be used as a pretext in calls and emails.", "Hours", "Communications"],
  hiring: ["Remove system names and approval roles from public job adverts.", "Hours", "People team"],
};
const SEV = { high: 3, medium: 2, low: 1 };

export function assemble({ org, domain, sector, dnsR, webR, now }) {
  const findings = [...dnsR.findings];
  const byArea = {};
  webR.facts.forEach((f) => { (byArea[f.area] = byArea[f.area] || []).push(f); });
  Object.keys(byArea).forEach((area) => {
    const a = AREAS[area];
    findings.push({ id: a.id, severity: a.severity, title: a.title, implication: a.implication, evidence: byArea[area].map((f) => ({ text: f.fact, url: f.source })) });
  });
  findings.sort((x, y) => SEV[y.severity] - SEV[x.severity]);

  const sources = [...new Set(webR.facts.map((f) => f.source))];
  const evidenceCount = (dnsR.ok ? 3 : 0) + webR.facts.length;
  const highs = findings.filter((f) => f.severity === "high").length;
  const mediums = findings.filter((f) => f.severity === "medium").length;

  let rating;
  if (evidenceCount < 2 || (!dnsR.ok && !webR.matched)) rating = { level: "insufficient", label: "Insufficient evidence" };
  else if (highs > 0 || mediums >= 4) rating = { level: "elevated", label: "Elevated" };
  else if (mediums >= 1) rating = { level: "moderate", label: "Moderate" };
  else rating = { level: "low", label: "Low" };

  const confidence = dnsR.ok && webR.facts.length >= 3 ? "High" : (dnsR.ok || webR.facts.length >= 2) ? "Medium" : "Low";

  const priority = findings.filter((f) => f.severity !== "low").length;
  let bottomLine;
  if (rating.level === "insufficient") {
    bottomLine = domain
      ? `There is not enough verifiable public evidence to rate ${org}'s exposure. A small public footprint lowers what an attacker can learn, but it does not show how staff, help desks or suppliers respond under pressure.`
      : `There is not enough verifiable public evidence to rate ${org}'s exposure. Add the website domain to include email-security records, or book a sweep for a tested view.`;
  } else {
    const top = findings[0];
    bottomLine = findings.length
      ? `${org}'s public footprint shows ${findings.length} exposure${findings.length === 1 ? "" : "s"} an attacker could use. Most material: ${top.title.charAt(0).toLowerCase() + top.title.slice(1)}.`
      : `${org}'s public footprint shows no exposures in the sources checked, and its email-security controls are in place.`;
  }

  const actions = findings.filter((f) => ACTIONS[f.id]).map((f) => ({ action: ACTIONS[f.id][0], why: f.title, effort: ACTIONS[f.id][1], owner: ACTIONS[f.id][2], severity: f.severity }));

  const sec = SECTOR_INTEL.sectors[sector];
  const sectorContext = { pattern: sec[0], incidents: sec[1].map((k) => { const i = SECTOR_INTEL.incidents[k]; return { name: i[0], line: i[1], vector: i[2], url: i[3] }; }) };

  return {
    version: 2, org, domain: domain || null, sector, generated_at: now,
    rating, priority, confidence: { level: confidence, sources: sources.length + (dnsR.ok ? 1 : 0) },
    bottom_line: bottomLine, findings, controls: dnsR.controls, actions, sector_context: sectorContext,
    method: { dns: dnsR.ok, web: webR.ran, web_matched: webR.matched, web_sources: sources },
  };
}

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins().includes(origin)) return json({ error: { message: "Origin not allowed" } }, 403);
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return json({ error: { message: "Too many requests" } }, 429);

  let body;
  try { body = await request.json(); } catch { return json({ error: { message: "Invalid request" } }, 400); }
  const org = String(body.organisation || "").trim().replace(/\s+/g, " ").slice(0, 100);
  const sector = String(body.sector || "");
  const domain = normaliseDomain(body.domain);
  if (!org || !SECTORS.includes(sector)) return json({ error: { message: "Choose a listed sector and enter an organisation name." } }, 400);
  if (domain === null) return json({ error: { message: "Enter a valid website domain, for example yourcompany.com." } }, 400);

  try {
    const [dnsR, webR] = await Promise.all([
      domain ? dnsEvidence(domain) : Promise.resolve({ ok: false, findings: [], controls: [], records: {} }),
      webEvidence(org, domain, sector),
    ]);
    return json(assemble({ org, domain, sector, dnsR, webR, now: new Date().toISOString() }), 200);
  } catch (e) {
    return json({ error: { message: "Report generation failed" } }, 502);
  }
}
