# Site Ops

This repo now carries its own monitoring for `vikramchopra.in`.

## What is automated

- Every push to `main` still deploys the site through GitHub Pages.
- Every hour, the `Site Ops` workflow runs:
  - local build
  - generated-page SEO audit
  - live URL health checks
  - redirect checks for retitled essays
  - desktop Lighthouse
  - mobile Lighthouse
- If any check fails, GitHub opens or updates a single `Site Ops Alert` issue with the failing details.
- If the next run passes, that issue is automatically closed.

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
  - Cloudflare, DNS, Google, Bing, or Buttondown account changes are outside this repo
  - those still need access to the relevant account to fully remediate

## Recommended dashboards to pin

- GitHub Actions: `Site Ops`
- GitHub Issues: label `site-ops`
- Google Search Console: Performance + Pages
- Bing Webmaster Tools: Search Performance + Sitemaps
- Cloudflare Analytics: Overview + Caching
- Buttondown: Subscribers + Emails
