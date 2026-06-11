# Audience Dashboard

This repo now includes a separate audience-reporting layer from the site health checks.

## What it does

- Builds a private audience report into:
  - `tmp/audience-dashboard.md`
  - `tmp/audience-dashboard.json`
- Aggregates, when configured:
  - Google Search Console search performance
  - Cloudflare traffic analytics
  - Buttondown subscriber and email activity
  - local Site Ops report presence
- Runs daily in GitHub Actions through `.github/workflows/audience-dashboard.yml`
- Uploads the report as an artifact and writes the markdown into the workflow summary
- Opens or updates a single `Audience Dashboard Alert` issue if the report job fails

## Required secrets

At least one provider must be configured to get useful audience data. Missing providers are skipped cleanly.

### Google Search Console

Preferred:
- `GOOGLE_SERVICE_ACCOUNT_JSON`

Alternative:
- `GOOGLE_SEARCH_CONSOLE_TOKEN`

Optional override:
- `GOOGLE_SEARCH_CONSOLE_SITE_URL`

Notes:
- If you use a service account, add that service account email as an owner or delegated user in Search Console for `https://vikramchopra.in/`.
- The script uses the official Search Console Search Analytics API.

### Cloudflare

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ZONE_ID`

Notes:
- The script uses Cloudflare's zone analytics dashboard API.
- The token needs zone analytics read access for the relevant zone.

### Buttondown

- `BUTTONDOWN_API_KEY`

Optional:
- `BUTTONDOWN_API_VERSION`

Notes:
- The script uses Buttondown's `/v1/subscribers` and `/v1/emails` endpoints.

## Local usage

Run:

```bash
node scripts/audience-dashboard.mjs
```

Then inspect:

```bash
tmp/audience-dashboard.md
tmp/audience-dashboard.json
```

## What is still not wired

- Bing Webmaster reporting is still not automated here.
- That can be added later, but it needs Bing-specific API auth wiring beyond the repo-default setup.
