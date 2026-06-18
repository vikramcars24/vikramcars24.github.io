# Vikram Chopra

For any change that touches website output or discoverability, run the full publish-and-SEO pass before calling the work done.

Run this after edits to `content/`, `src/`, `media/`, `scripts/build.mjs`, `scripts/seo-audit.mjs`, `posts/`, `index.html`, `archive/`, `_redirects`, `rss.xml`, `sitemap.xml`, `robots.txt`, or social metadata:

- `npm run publish:root`
- `npm run seo:audit`

Do not report the site as ready or live if `seo:audit` fails.

If network access is available and the user wants the site live, also verify the changed public URLs and their `og:image` assets over HTTP.

Any change to `styles.css` or templates requires running `npm run qa:visual` and visually reviewing all six screenshots before push. Never modify rules inside a media query without re-checking both viewports. Never add width constraints to `.article-body` or grid changes to entry/archive rows without screenshot review.

GitHub and site-ops email is a first-class operating surface for this repo, not an optional side channel.

When a website incident or GitHub/site error appears, the agent should decide the operating surface automatically.

- Use repo or Git first for site defects: code, content, media, build, CI workflow, SEO, redirects, metadata, layout, or generated artifact problems.
- Use device first for account or auth defects: Gmail, Slack, browser sessions, Cloudflare, local tokens, local screenshots, or machine-specific credentials.
- Use both automatically when the same incident crosses both surfaces. Example: read the alert through device-side email or browser access, fix the underlying website problem in the repo, then verify the live site from the device.
- Do not ask Vikram to choose repo versus device unless the path is genuinely risky, irreversible, or blocked on a human-only permission step.

For any deploy, CI, dashboard, or site-health incident, closure requires:

- replacement run green
- alert issue closed or recovered
- stale incident email cleared
- memory updated

Run the morning ops sweep when handling ongoing website operations:

- triage fresh GitHub/site email
- review failing or newly completed GitHub Actions runs
- check open alert issues
- clear stale resolved noise
