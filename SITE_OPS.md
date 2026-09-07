# Site Ops

This repo now carries its own monitoring for `vikramchopra.in`.

## What is automated

- Every push to `main` deploys independently to Cloudflare Pages and GitHub Pages.
- After both deploys succeed, the edge router is deployed in front of the site. It serves Cloudflare Pages normally and automatically retries safe requests against GitHub Pages after a primary timeout or `5xx`.
- Every five minutes, the lightweight `Uptime Watchdog` checks the homepage, archive, subscribe page, sitemap, RSS feed, a published PDF, and the independent GitHub Pages fallback.
- If public traffic is being served from the fallback, the site stays available but the watchdog opens an incident because redundancy is degraded.
- The watchdog retries transient failures once, opens or updates one durable `Uptime Alert` issue, and sends Slack only when an incident opens or recovers.
- Every day, the deeper `Site Ops` workflow runs:
  - local build
  - generated-page SEO audit
  - live URL health checks
  - redirect checks for retitled essays
  - desktop Lighthouse
  - mobile Lighthouse
- If any check fails, GitHub opens or updates a single `Site Ops Alert` issue with the failing details.
- If the next run passes, that issue is automatically closed.
- Deep Site Ops failures are not sent to Vikram's Slack DM unless the problem is a human-only blocker.

## What this covers well

- site is up
- key pages return `200`
- essay redirects still work
- sitemap, RSS, and robots are reachable
- generated metadata stays internally consistent
- performance regressions get caught

## What still lives in external dashboards

- Traffic and audience:
  - Google Search Console for queries, pages, indexing, CTR
  - Bing Webmaster Tools for Bing indexing
  - Cloudflare Analytics for visits, bandwidth, cache ratio
- Subscribers:
  - Buttondown dashboard for subscriber count, growth, open rates

## Operating model

- Repo-level failures:
  - the workflow will catch them
  - the issue becomes the queue for fixing them
- External platform failures:
  - the watchdog detects public availability failures independently from Cloudflare Pages
  - the edge router automatically fails `GET` and `HEAD` requests over to the independent GitHub Pages deployment when the primary origin times out or returns `5xx`
  - non-idempotent requests are never replayed to avoid duplicate writes
  - Cloudflare, DNS, Google, Bing, or Buttondown account changes still require access to the relevant account to fully remediate

## Recommended dashboards to pin

- GitHub Actions: `Uptime Watchdog` and `Site Ops`
- GitHub Issues: label `uptime`
- GitHub Issues: label `site-ops`
- Google Search Console: Performance + Pages
- Bing Webmaster Tools: Search Performance + Sitemaps
- Cloudflare Analytics: Overview + Caching
- Buttondown: Subscribers + Emails
