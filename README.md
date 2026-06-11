# Vikram Writing Site

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

## Slack file download

If a source PDF or attachment is stuck behind Slack connector permissions, you can fetch it directly with a Slack API token that has `files:read`.

```bash
SLACK_TOKEN=xoxp-or-xoxb npm run slack:download -- https://cars24.slack.com/files/U054KL2NR/F0B5ZEB6S92/flatland.pdf
```

That saves the file into `downloads/` by default. You can also pass a raw Slack file ID and optionally override the destination:

```bash
SLACK_TOKEN=xoxp-or-xoxb npm run slack:download -- F0B5ZEB6S92 --out downloads/flatland.pdf
```

For broader Slack API access using your own app token, use the local helper:

```bash
SLACK_TOKEN=xoxp-or-xoxb npm run slack:api -- channel C0GUPESGJ --limit 5
SLACK_TOKEN=xoxp-or-xoxb npm run slack:api -- thread C0GUPESGJ 1768793402.113289
SLACK_TOKEN=xoxp-or-xoxb npm run slack:api -- file-info F0B8ZMQBFQA
SLACK_TOKEN=xoxp-or-xoxb npm run slack:api -- download F0B8ZMQBFQA --out downloads/maker-agent-v2.zip
SLACK_TOKEN=xoxp-or-xoxb npm run slack:api -- user U054KL2NR
```

To avoid exporting the token every time, create a local file in the repo root that is not committed:

```bash
printf "SLACK_TOKEN='xoxp-...'\n" > ".slack-token"
chmod 600 ".slack-token"
```

After that, `npm run slack:api -- ...` will pick it up automatically from the project root.

## UniPile WhatsApp connection

This repo now includes a small helper to create a UniPile Hosted Auth link for WhatsApp.

Set your UniPile API key, then run:

```bash
UNIPILE_API_KEY=your_api_key npm run whatsapp:connect
```

If `/Users/vikram/Desktop/unipile/.env` already exists, the script will reuse that UniPile setup automatically.
If a WhatsApp account is already linked in UniPile, the script will print the existing `account_id` instead of starting a new QR flow.

Optional environment variables:

- `UNIPILE_REDIRECT_URI`: defaults to `http://127.0.0.1:8787/unipile/callback`
- `UNIPILE_LINK_EXPIRES_MINUTES`: defaults to `10`
- `UNIPILE_AUTH_DOMAIN`: optional custom Hosted Auth domain such as `auth.yourapp.com`
- `UNIPILE_WAIT_FOR_SYNC`: set to `true` to wait for initial sync before redirecting

The script will print a UniPile auth URL. Open it, choose WhatsApp, then scan the QR code from your phone. If you keep the default redirect URI, the script also starts a small local callback server and prints the linked `account_id` after UniPile redirects back.

## UniPile WhatsApp reading

To list recent WhatsApp chats and show messages from the latest chat:

```bash
npm run whatsapp:read
```

Optional usage:

- `npm run whatsapp:read -- t8GNEog8SGKQNKKmFOQHcQ`
- `npm run whatsapp:read -- --chats 10 --messages 50`

The script reuses the same env fallback order as `whatsapp:connect`, auto-detects the first linked WhatsApp account if you do not pass an `account_id`, and prints recent chats plus message text from the newest chat.
