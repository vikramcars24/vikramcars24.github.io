# Vikram Chopra

A minimal essay site inspired by the clean, text-first feel of [darioamodei.com](https://www.darioamodei.com/).

## How it works

- Write posts in `content/posts/*.md`
- Update your site details in `content/site.json`
- Build the static site with `npm run build`
- Preview locally with `npm run serve`

The generated website lives in `dist/`, which you can deploy to Netlify, Vercel, GitHub Pages, or any static host.

## Post format

Each post uses simple front matter:

```md
---
title: Your Title
date: 2026-06-06
description: A one-line summary for cards, previews, and SEO.
featured: false
category: Essay
---

Your writing starts here.
```

For essays, add real top-level `##` sections in the main body before `## Notes and Sources`.
The sidebar TOC is intended to reflect the article's argument, not only the research appendix.
Each essay should also get its own visual identity from scratch. Do not reuse or lightly tweak a previous essay's image system, motif, or composition.
When essay visuals fall under the Cars24 Maker workflow, strictly follow the `cars24-maker-agent` skill and its loaded creative-direction sources rather than improvising a parallel system.

Supported Markdown includes:

- `#`, `##`, `###` headings
- paragraphs
- `-` bullet lists and `1.` numbered lists
- blockquotes with `>`
- fenced code blocks
- `**bold**`, `*italics*`, `` `inline code` ``, and links

## First run

```bash
npm run build
npm run serve
```

Then open [http://localhost:4321](http://localhost:4321).

## Site ops

This repo includes automated monitoring for the live site.

- Deploys run on push to `main` via `.github/workflows/deploy.yml`
- Hourly health checks run via `.github/workflows/site-ops.yml`
- The health workflow checks build, SEO, live URLs, redirects, and Lighthouse budgets
- Failures open or update a `Site Ops Alert` GitHub issue automatically

Operational details live in `SITE_OPS.md`.

## Audience dashboard

This repo also includes a separate audience-reporting layer for search, traffic, and subscriber metrics.

- Run locally with `npm run audience:report`
- Daily workflow: `.github/workflows/audience-dashboard.yml`
- Setup and provider requirements: `AUDIENCE_DASHBOARD.md`

## Monthly Slack site report

This repo also includes a lightweight monthly site report that is sent to Slack DM.

- Audience data is generated with `npm run audience:report`
- Monthly workflow: `.github/workflows/slack-dashboard.yml`
- Slack DM sender: `node scripts/send-monthly-site-report-slack.mjs`
- Configure `SLACK_TOKEN` as a GitHub Actions secret
- Configure `SLACK_REPORT_DM_USER` as a GitHub Actions variable or secret

## Shared integrations

This repo is not the home for generic integrations like UniPile / WhatsApp.

- Keep site-owned Slack automation here when it is directly about this site's monitoring or reporting.
- Keep reusable cross-repo integrations in `~/Agent-Ops`.

For generic Slack API access or Slack file downloads, use:

```bash
node ~/Agent-Ops/scripts/slack-api.mjs channel C0GUPESGJ --limit 5
node ~/Agent-Ops/scripts/slack-download-file.mjs F0B5ZEB6S92 --out downloads/flatland.pdf
```

For UniPile / WhatsApp, use:

```bash
node ~/Agent-Ops/scripts/unipile-whatsapp-connect.mjs
node ~/Agent-Ops/scripts/unipile-whatsapp-read.mjs
```
