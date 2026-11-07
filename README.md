# humannode.io

One Vercel project: the site and the Exposure Check engine.

- `index.html`: the site. Hash routes `#exposure-check`, `#exposure-audit`, `#ai-audit`, `#os1`, `#pricing`, `#contact`.
- `package.json`: marks the project as ES modules (no build step).
- `api/check.js`: the Exposure Check engine (Vercel Function, Node.js runtime). The Exposure Check tab posts to `/api/check`.
- `api/contact.js`: delivers the contact form by email through Resend. The Contact tab posts to `/api/contact`.

## Deploy (GitHub + Vercel)
1. Create a GitHub repo (e.g. `humannode-site`) and push these files to `main`.
2. Vercel → Add New → Project → import the repo. Framework preset: **Other**. No build command. Output directory: root.
3. Vercel → Project → Settings → Environment Variables: add `PERPLEXITY_API_KEY`, `RESEND_API_KEY` and `CONTACT_TO` (the inbox that receives requests) for Production and Preview. Redeploy.
4. Settings → Domains: add `humannode.io` and `www.humannode.io` (redirect `www` to the apex). Add the DNS records Vercel shows.
5. Run one check on the live site.

## Exposure Check engine
Evidence, in order of weight: public DNS records for the domain (DMARC, SPF, MX), cited public web facts
(Perplexity; any fact without a matching citation is dropped), and 2026 sector incidents from the Human Node
breach log (curated in `api/check.js`, each with a source). Ratings are rules-based. Thin evidence returns
"Insufficient evidence", never a score. To update sector incidents, edit `SECTOR_INTEL` in `api/check.js`.

- Accepts requests only from `https://humannode.io`, `https://www.humannode.io` and the current preview URL.
  Override with `ALLOWED_ORIGINS` (comma-separated) if the domain changes.
- 5 checks per IP per 10 minutes, per instance. Add a Vercel Firewall rate-limit rule on `/api/check` for a hard limit.

## Contact form
Requests are emailed to `CONTACT_TO` with the visitor's address as reply-to. Nothing is stored.
Until `humannode.io` is verified in Resend, the sender is `onboarding@resend.dev`, which only delivers to the
Resend account owner's own email, so set `CONTACT_TO` to that address. Once the domain is verified, set
`CONTACT_FROM` (e.g. `Human Node <requests@humannode.io>`). If the keys are missing, the form tells visitors to
call +44 7784 424121 and lets them copy their request. Limit: 3 requests per IP per 10 minutes, per instance.

## Before launch
- Registered company name, number and address in the footer.
- Privacy notice (the contact form collects name, email, phone and organisation).
- Contact form keys set and one test request received.
- Firewall rate limit on `/api/check`.
- Retire the old `check.humannode.io` DNS record and archived project.
