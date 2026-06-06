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

## Slack file download

If a source PDF or attachment is stuck behind Slack connector permissions, you can fetch it directly with a Slack API token that has `files:read`.

```bash
SLACK_TOKEN=xoxp-or-xoxb npm run slack:download -- https://cars24.slack.com/files/U054KL2NR/F0B5ZEB6S92/flatland.pdf
```

That saves the file into `downloads/` by default. You can also pass a raw Slack file ID and optionally override the destination:

```bash
SLACK_TOKEN=xoxp-or-xoxb npm run slack:download -- F0B5ZEB6S92 --out downloads/flatland.pdf
```

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
