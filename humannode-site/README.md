# humannode.io

One Vercel project: the site and the Exposure Check engine.

- `index.html`: the site. Hash routes `#exposure-check`, `#exposure-audit`, `#ai-audit`, `#os1`, `#pricing`, `#contact`.
- `api/check.js`: the Exposure Check engine (Vercel Edge Function). The Exposure Check tab posts to `/api/check`.

## Deploy (GitHub + Vercel)
1. Create a GitHub repo (e.g. `humannode-site`) and push these files to `main`.
2. Vercel → Add New → Project → import the repo. Framework preset: **Other**. No build command. Output directory: root.
3. Vercel → Project → Settings → Environment Variables: add `PERPLEXITY_API_KEY` (Production and Preview). Redeploy.
4. Settings → Domains: add `humannode.io` and `www.humannode.io` (redirect `www` to the apex). Add the DNS records Vercel shows.
5. Run one check on the live site.

## Exposure Check engine
- Accepts requests only from `https://humannode.io`, `https://www.humannode.io` and the current preview URL.
  Override with `ALLOWED_ORIGINS` (comma-separated) if the domain changes.
- 5 checks per IP per 10 minutes, per instance. Add a Vercel Firewall rate-limit rule on `/api/check` for a hard limit.

## Before launch
- Registered company name, number and address in the footer.
- Privacy notice.
- Firewall rate limit on `/api/check`.
- Retire the old `check.humannode.io` DNS record and archived project.
