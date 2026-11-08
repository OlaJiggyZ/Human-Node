# humannode.io

One Vercel project: the site and the Exposure Check engine.

- `index.html`: the site. Hash routes `#exposure-check`, `#exposure-audit`, `#ai-audit`, `#os1`, `#pricing`, `#contact`.
- `package.json`: marks the project as ES modules (no build step).
- `api/check.js`: the Exposure Check engine (Vercel Function, Node.js runtime). The Exposure Check tab posts to `/api/check`.

## Deploy (GitHub + Vercel)
1. Create a GitHub repo (e.g. `humannode-site`) and push these files to `main`.
2. Vercel → Add New → Project → import the repo. Framework preset: **Other**. No build command. Output directory: root.
3. Vercel → Project → Settings → Environment Variables: add `PERPLEXITY_API_KEY` (Production and Preview). Redeploy.
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

## Before launch
- Registered company name, number and address in the footer.
- Privacy notice.
- Firewall rate limit on `/api/check`.
- Retire the old `check.humannode.io` DNS record and archived project.
