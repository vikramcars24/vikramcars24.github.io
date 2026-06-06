import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "content");
const postsDir = path.join(contentDir, "posts");
const distDir = path.join(rootDir, "dist");
const assetsDir = path.join(rootDir, "src");

async function main() {
  const site = JSON.parse(await fs.readFile(path.join(contentDir, "site.json"), "utf8"));
  const posts = await loadPosts(site);
  const mediaDir = path.join(assetsDir, "media");

  posts.sort((left, right) => right.date.localeCompare(left.date));

  await fs.rm(distDir, { recursive: true, force: true });
  await ensureDir(path.join(distDir, "archive"));
  await ensureDir(path.join(distDir, "posts"));

  await fs.copyFile(path.join(assetsDir, "styles.css"), path.join(distDir, "styles.css"));
  await copyDirectoryIfPresent(mediaDir, path.join(distDir, "media"));

  await fs.writeFile(path.join(distDir, "index.html"), renderHome(site, posts), "utf8");
  await fs.writeFile(path.join(distDir, "archive", "index.html"), renderArchive(site, posts), "utf8");
  await fs.writeFile(path.join(distDir, "404.html"), renderNotFound(site), "utf8");

  for (const post of posts) {
    const postDir = path.join(distDir, "posts", post.slug);
    await ensureDir(postDir);
    await fs.writeFile(path.join(postDir, "index.html"), renderPost(site, post), "utf8");
  }

  await fs.writeFile(path.join(distDir, "rss.xml"), renderRss(site, posts), "utf8");
  await fs.writeFile(path.join(distDir, "sitemap.xml"), renderSitemap(site, posts), "utf8");
  await fs.writeFile(path.join(distDir, "robots.txt"), renderRobots(site), "utf8");

  console.log(`Built ${posts.length} post(s) into ${distDir}`);
}

async function loadPosts(site) {
  const files = await fs.readdir(postsDir);
  const markdownFiles = files
    .filter((file) => file.endsWith(".md") && !path.basename(file).startsWith("_"))
    .sort();

  return Promise.all(
    markdownFiles.map(async (file) => {
      const absolutePath = path.join(postsDir, file);
      const raw = await fs.readFile(absolutePath, "utf8");
      const { attributes, body } = parseFrontMatter(raw);
      const slug = attributes.slug || file.replace(/\.md$/, "");
      const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
      const readingMinutes = Math.max(1, Math.round(wordCount / 220));
      const bodyHtml = renderMarkdown(body);
      const leadBodyHtml = bodyHtml.replace("<p>", '<p class="lead">');

      return {
        site,
        slug,
        title: attributes.title || slugToTitle(slug),
        date: attributes.date || new Date().toISOString().slice(0, 10),
        description: attributes.description || createExcerpt(body),
        image: attributes.image || "",
        imageAlt: attributes.imageAlt || attributes.title || slugToTitle(slug),
        category: attributes.category || "Essay",
        featured: attributes.featured === true,
        wordCount,
        readingMinutes,
        bodyHtml: leadBodyHtml
      };
    })
  );
}

function parseFrontMatter(raw) {
  if (!raw.startsWith("---\n")) {
    return { attributes: {}, body: raw.trim() };
  }

  const marker = "\n---\n";
  const closingIndex = raw.indexOf(marker, 4);

  if (closingIndex === -1) {
    return { attributes: {}, body: raw.trim() };
  }

  const frontMatter = raw.slice(4, closingIndex).trim();
  const body = raw.slice(closingIndex + marker.length).trim();
  const attributes = {};

  for (const line of frontMatter.split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    attributes[key] = coerceValue(value);
  }

  return { attributes, body };
}

function coerceValue(value) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push(
        `<pre><code${language ? ` class="language-${escapeAttribute(language)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`
      );
      index += 1;
      continue;
    }

    if (/^###\s+/.test(line)) {
      blocks.push(`<h3>${renderInline(line.replace(/^###\s+/, ""))}</h3>`);
      index += 1;
      continue;
    }

    if (/^##\s+/.test(line)) {
      blocks.push(`<h2>${renderInline(line.replace(/^##\s+/, ""))}</h2>`);
      index += 1;
      continue;
    }

    if (/^#\s+/.test(line)) {
      blocks.push(`<h1>${renderInline(line.replace(/^#\s+/, ""))}</h1>`);
      index += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push("<hr>");
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = [];

      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }

      blocks.push(`<blockquote>${renderMarkdown(quoteLines.join("\n"))}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];

      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(`<li>${renderInline(lines[index].replace(/^[-*]\s+/, ""))}</li>`);
        index += 1;
      }

      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(`<li>${renderInline(lines[index].replace(/^\d+\.\s+/, ""))}</li>`);
        index += 1;
      }

      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraphLines = [];

    while (index < lines.length && !startsNewBlock(lines[index])) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push(`<p>${renderInline(paragraphLines.join(" "))}</p>`);
  }

  return blocks.join("\n");
}

function startsNewBlock(line) {
  if (!line.trim()) {
    return true;
  }

  return [
    /^```/,
    /^###\s+/,
    /^##\s+/,
    /^#\s+/,
    /^>\s?/,
    /^[-*]\s+/,
    /^\d+\.\s+/,
    /^---+$/
  ].some((pattern) => pattern.test(line));
}

function renderInline(text) {
  let output = escapeHtml(text);
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    return `<a href="${escapeAttribute(href)}">${label}</a>`;
  });
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return output;
}

function renderHome(site, posts) {
  const featured = posts.find((post) => post.featured) || posts[0];
  const recent = posts.slice(0, 6);

  return renderDocument({
    site,
    title: site.siteTitle,
    description: site.description,
    pathName: "/",
    imagePath: featured?.image || "",
    bodyClass: "home-page",
    content: `
      <div class="page-shell">
        ${renderHeader(site)}
        <main class="content">
          <section class="hero reveal">
            <div class="hero-copy">
              <p class="eyebrow">Writing</p>
              <h1>${escapeHtml(site.name)}</h1>
              <p class="tagline">${escapeHtml(site.tagline)}</p>
              <p class="intro">${escapeHtml(site.intro)}</p>
            </div>
            <aside class="hero-aside">
              <p class="aside-label">Publishing thesis</p>
              <p class="aside-quote">A sharp home for essays that reward attention, not infinite scrolling.</p>
            </aside>
          </section>

          <section class="feature reveal delay-1">
            <div class="section-heading">
              <p class="eyebrow">Featured essay</p>
              <a href="${sitePath(site, "/archive/")}" class="inline-link">View archive</a>
            </div>
            ${renderFeaturedPost(featured)}
          </section>

          <section class="listing reveal delay-2">
            <div class="section-heading">
              <p class="eyebrow">Recent writing</p>
              <p class="section-note">Clean, text-first publishing for essays, notes, and letters.</p>
            </div>
            <div class="post-list">
              ${recent.map(renderPostCard).join("")}
            </div>
          </section>

          <section class="about reveal delay-3">
            <p class="eyebrow">About this site</p>
            <div class="about-grid">
              <p>${escapeHtml(site.about)}</p>
              <p>Expect longer essays when an idea needs room, and shorter notes when a sentence is still alive enough to publish before it hardens into certainty.</p>
            </div>
          </section>
        </main>
        ${renderFooter(site)}
      </div>
    `
  });
}

function renderArchive(site, posts) {
  const postsByYear = groupBy(posts, (post) => post.date.slice(0, 4));
  const years = Object.keys(postsByYear).sort((left, right) => right.localeCompare(left));

  return renderDocument({
    site,
    title: `Archive | ${site.siteTitle}`,
    description: `Archive of essays and notes by ${site.name}.`,
    pathName: "/archive/",
    imagePath: "",
    bodyClass: "archive-page",
    content: `
      <div class="page-shell">
        ${renderHeader(site)}
        <main class="content archive-content">
          <section class="archive-hero reveal">
            <p class="eyebrow">Archive</p>
            <h1>Published writing</h1>
            <p class="intro">Every essay lives here in one place, ordered for browsing instead of feeding an algorithm.</p>
          </section>

          ${years
            .map((year, index) => {
              return `
                <section class="year-group reveal delay-${Math.min(index + 1, 3)}">
                  <div class="year-heading">${year}</div>
                  <div class="year-posts">
                    ${postsByYear[year].map(renderArchiveRow).join("")}
                  </div>
                </section>
              `;
            })
            .join("")}
        </main>
        ${renderFooter(site)}
      </div>
    `
  });
}

function renderPost(site, post) {
  return renderDocument({
    site,
    title: `${post.title} | ${site.siteTitle}`,
    description: post.description,
    pathName: `/posts/${post.slug}/`,
    imagePath: post.image,
    bodyClass: "post-page",
    content: `
      <div class="page-shell">
        ${renderHeader(site)}
        <main class="content">
          <article class="essay reveal">
            <nav class="breadcrumb">
              <a href="${sitePath(site, "/")}">Home</a>
              <span>/</span>
              <a href="${sitePath(site, "/archive/")}">Archive</a>
            </nav>
            <header class="essay-header">
              <p class="eyebrow">${escapeHtml(post.category)}</p>
              <h1>${escapeHtml(post.title)}</h1>
              <p class="dek">${escapeHtml(post.description)}</p>
              <div class="meta">
                <span>${formatDate(post.date)}</span>
                <span>${post.readingMinutes} min read</span>
                <span>${post.wordCount} words</span>
              </div>
            </header>
            ${renderEssayCover(post)}
            <div class="article-body">
              ${post.bodyHtml}
            </div>
          </article>
        </main>
        ${renderFooter(site)}
      </div>
    `
  });
}

function renderNotFound(site) {
  return renderDocument({
    site,
    title: `Not found | ${site.siteTitle}`,
    description: site.description,
    pathName: "/404.html",
    imagePath: "",
    bodyClass: "not-found-page",
    content: `
      <div class="page-shell">
        ${renderHeader(site)}
        <main class="content">
          <section class="not-found reveal">
            <p class="eyebrow">404</p>
            <h1>That page drifted off.</h1>
            <p class="intro">The writing is still intact. Start again from the homepage or the archive.</p>
            <div class="cta-row">
              <a class="button-link" href="${sitePath(site, "/")}">Go home</a>
              <a class="button-link button-link-muted" href="${sitePath(site, "/archive/")}">Open archive</a>
            </div>
          </section>
        </main>
        ${renderFooter(site)}
      </div>
    `
  });
}

function renderDocument({ site, title, description, pathName, imagePath, content, bodyClass }) {
  const canonical = absoluteUrl(site.domain, sitePath(site, pathName));
  const ogImage = imagePath ? absoluteUrl(site.domain, sitePath(site, imagePath)) : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttribute(description)}">
    <link rel="canonical" href="${escapeAttribute(canonical)}">
    <link rel="alternate" type="application/rss+xml" title="${escapeAttribute(site.siteTitle)} RSS" href="${escapeAttribute(absoluteUrl(site.domain, sitePath(site, "/rss.xml")))}">
    <meta property="og:title" content="${escapeAttribute(title)}">
    <meta property="og:description" content="${escapeAttribute(description)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escapeAttribute(canonical)}">
    ${ogImage ? `<meta property="og:image" content="${escapeAttribute(ogImage)}">` : ""}
    <meta name="twitter:card" content="summary_large_image">
    ${ogImage ? `<meta name="twitter:image" content="${escapeAttribute(ogImage)}">` : ""}
    <meta name="theme-color" content="#f4ecdf">
    <link rel="stylesheet" href="${sitePath(site, "/styles.css")}">
  </head>
  <body class="${escapeAttribute(bodyClass)}">
    ${content}
  </body>
</html>`;
}

function renderHeader(site) {
  return `
    <header class="site-header">
      <a class="brand" href="${sitePath(site, "/")}">
        <span class="brand-mark"></span>
        <span>${escapeHtml(site.name)}</span>
      </a>
      <nav class="site-nav" aria-label="Primary">
        <a href="${sitePath(site, "/")}">Home</a>
        <a href="${sitePath(site, "/archive/")}">Archive</a>
        <a href="${sitePath(site, "/rss.xml")}">RSS</a>
      </nav>
    </header>
  `;
}

function renderFooter(site) {
  return `
    <footer class="site-footer">
      <p>${escapeHtml(site.footerNote)}</p>
      <p class="footer-note">Read in sequence from the archive, or subscribe in a feed reader through RSS.</p>
    </footer>
  `;
}

function renderFeaturedPost(post) {
  return `
    <article class="featured-card">
      ${renderCardImage(post, "featured-card-image")}
      <div class="featured-meta">
        <span>${escapeHtml(post.category)}</span>
        <span>${formatDate(post.date)}</span>
        <span>${post.readingMinutes} min read</span>
      </div>
      <h2><a href="${sitePath(post.site, `/posts/${post.slug}/`)}">${escapeHtml(post.title)}</a></h2>
      <p>${escapeHtml(post.description)}</p>
      <a class="button-link" href="${sitePath(post.site, `/posts/${post.slug}/`)}">Read essay</a>
    </article>
  `;
}

function renderPostCard(post) {
  return `
    <article class="post-card">
      ${renderCardImage(post, "post-card-image")}
      <div class="post-card-meta">
        <span>${formatDate(post.date)}</span>
        <span>${post.readingMinutes} min read</span>
      </div>
      <h3><a href="${sitePath(post.site, `/posts/${post.slug}/`)}">${escapeHtml(post.title)}</a></h3>
      <p>${escapeHtml(post.description)}</p>
    </article>
  `;
}

function renderArchiveRow(post) {
  return `
    <article class="archive-row">
      <div class="archive-row-date">${formatShortDate(post.date)}</div>
      <div class="archive-row-body">
        <h2><a href="${sitePath(post.site, `/posts/${post.slug}/`)}">${escapeHtml(post.title)}</a></h2>
        <p>${escapeHtml(post.description)}</p>
      </div>
      <div class="archive-row-meta">${post.readingMinutes} min</div>
    </article>
  `;
}

function renderCardImage(post, className) {
  if (!post.image) {
    return "";
  }

  return `
    <a class="${className}" href="${sitePath(post.site, `/posts/${post.slug}/`)}">
      <img src="${escapeAttribute(sitePath(post.site, post.image))}" alt="${escapeAttribute(post.imageAlt)}">
    </a>
  `;
}

function renderEssayCover(post) {
  if (!post.image) {
    return "";
  }

  return `
    <figure class="essay-cover">
      <img src="${escapeAttribute(sitePath(post.site, post.image))}" alt="${escapeAttribute(post.imageAlt)}">
    </figure>
  `;
}

function renderRss(site, posts) {
  const items = posts
    .map((post) => {
      const url = absoluteUrl(site.domain, sitePath(site, `/posts/${post.slug}/`));
      const description = escapeXml(post.description);
      const content = escapeXml(post.bodyHtml);

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid>${escapeXml(url)}</guid>
      <pubDate>${new Date(`${post.date}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${description}</description>
      <content:encoded><![CDATA[${post.bodyHtml}]]></content:encoded>
    </item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(site.siteTitle)}</title>
    <link>${escapeXml(site.domain)}</link>
    <description>${escapeXml(site.description)}</description>${items}
  </channel>
</rss>`;
}

function renderSitemap(site, posts) {
  const urls = ["/", "/archive/", ...posts.map((post) => `/posts/${post.slug}/`)];
  const nodes = urls
    .map((url) => {
      return `
  <url>
    <loc>${escapeXml(absoluteUrl(site.domain, sitePath(site, url)))}</loc>
  </url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nodes}
</urlset>`;
}

function renderRobots(site) {
  return `User-agent: *
Allow: /

Sitemap: ${absoluteUrl(site.domain, sitePath(site, "/sitemap.xml"))}
`;
}

function sitePath(site, pathName) {
  const basePath = normalizeBasePath(site.basePath || "");

  if (!basePath) {
    return pathName;
  }

  if (pathName === "/") {
    return `${basePath}/`;
  }

  return `${basePath}${pathName}`;
}

function normalizeBasePath(basePath) {
  if (!basePath || basePath === "/") {
    return "";
  }

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateString}T12:00:00Z`));
}

function formatShortDate(dateString) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${dateString}T12:00:00Z`));
}

function groupBy(items, selector) {
  return items.reduce((groups, item) => {
    const key = selector(item);
    groups[key] ||= [];
    groups[key].push(item);
    return groups;
  }, {});
}

function slugToTitle(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createExcerpt(body) {
  const plainText = body.replace(/\s+/g, " ").trim();
  return plainText.length <= 160 ? plainText : `${plainText.slice(0, 157).trimEnd()}...`;
}

function absoluteUrl(domain, pathName) {
  return new URL(pathName, ensureTrailingSlash(domain)).toString();
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(String(value));
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function copyDirectoryIfPresent(source, destination) {
  try {
    await fs.access(source);
  } catch {
    return;
  }

  await fs.cp(source, destination, { recursive: true });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
