# Vikram Writing Site

For any change that touches website output or discoverability, run the full publish-and-SEO pass before calling the work done.

Run this after edits to `content/`, `src/`, `media/`, `scripts/build.mjs`, `scripts/seo-audit.mjs`, `posts/`, `index.html`, `archive/`, `_redirects`, `rss.xml`, `sitemap.xml`, `robots.txt`, or social metadata:

- `npm run publish:root`
- `npm run seo:audit`

Do not report the site as ready or live if `seo:audit` fails.

If network access is available and the user wants the site live, also verify the changed public URLs and their `og:image` assets over HTTP.

Any change to `styles.css` or templates requires running `npm run qa:visual` and visually reviewing all six screenshots before push. Never modify rules inside a media query without re-checking both viewports. Never add width constraints to `.article-body` or grid changes to entry/archive rows without screenshot review.
