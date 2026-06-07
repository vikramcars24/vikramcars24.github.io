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
  await fs.copyFile(path.join(assetsDir, "favicon.svg"), path.join(distDir, "favicon.svg"));
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
      const { html: bodyHtml, headings } = renderMarkdown(body);
      warnIfEssayNeedsMainSections({ slug, category: attributes.category || "Essay", headings });
      return {
        site,
        slug,
        title: attributes.title || slugToTitle(slug),
        displayTitle: attributes.displayTitle || attributes.title || slugToTitle(slug),
        date: attributes.date || new Date().toISOString().slice(0, 10),
        description: attributes.description || createExcerpt(body),
        image: attributes.image || "",
        imageAlt: attributes.imageAlt || attributes.title || slugToTitle(slug),
        articleImage: attributes.articleImage || "",
        articleImageAlt: attributes.articleImageAlt || attributes.imageAlt || attributes.title || slugToTitle(slug),
        summary: attributes.summary || "",
        category: attributes.category || "Essay",
        featured: attributes.featured === true,
        wordCount,
        readingMinutes,
        bodyHtml,
        headings
      };
    })
  );
}

function warnIfEssayNeedsMainSections({ slug, category, headings }) {
  if (category !== "Essay") {
    return;
  }

  const levelTwoHeadings = (headings || []).filter((heading) => heading.level === 2);

  if (levelTwoHeadings.length === 0) {
    console.warn(`[toc] ${slug}: add main-article ## sections so the sidebar table of contents is not empty.`);
    return;
  }

  const notesIndex = levelTwoHeadings.findIndex((heading) => heading.id === "notes-and-sources");
  const mainHeadings = notesIndex === -1
    ? levelTwoHeadings
    : levelTwoHeadings.slice(0, notesIndex);

  if (mainHeadings.length === 0) {
    console.warn(`[toc] ${slug}: add main-article ## sections before "Notes and Sources" so the sidebar table of contents reflects the essay.`);
  }
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
  const headings = [];
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
      const text = line.replace(/^###\s+/, "");
      const id = slugifyHeading(text, headings);
      headings.push({ level: 3, text: stripFormatting(text), id });
      blocks.push(`<h3 id="${escapeAttribute(id)}">${renderInline(text)}</h3>`);
      index += 1;
      continue;
    }

    if (/^##\s+/.test(line)) {
      const text = line.replace(/^##\s+/, "");
      const id = slugifyHeading(text, headings);
      headings.push({ level: 2, text: stripFormatting(text), id });
      blocks.push(`<h2 id="${escapeAttribute(id)}">${renderInline(text)}</h2>`);
      index += 1;
      continue;
    }

    if (/^#\s+/.test(line)) {
      const text = line.replace(/^#\s+/, "");
      const id = slugifyHeading(text, headings);
      headings.push({ level: 1, text: stripFormatting(text), id });
      blocks.push(`<h1 id="${escapeAttribute(id)}">${renderInline(text)}</h1>`);
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

  return { html: blocks.join("\n"), headings };
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
  const latest = posts[0];
  const archivePosts = posts.slice(1);
  const interviews = Array.isArray(site.interviews) ? site.interviews : [];
  const interviewSections = groupBy(interviews, (interview) => interview.section || "Interviews");
  const elsewhere = Array.isArray(site.elsewhere) ? site.elsewhere : [];

  return renderDocument({
    site,
    title: site.siteTitle,
    description: site.description,
    pathName: "/",
    imagePath: featured?.image || "",
    imageAlt: featured?.imageAlt || site.siteTitle,
    bodyClass: "home-page",
    openGraphType: "website",
    content: `
      <div class="page-shell">
        ${renderHeader(site)}
        <main class="content">
          <section class="home-intro">
            <h1>${escapeHtml(site.name)}</h1>
            <p class="home-intro-copy">${escapeHtml(site.intro)}</p>
            <p class="home-intro-copy">${escapeHtml(site.about)}</p>
          </section>

          <section class="home-writing">
            <div class="home-section-head">
              <p class="home-label">Writing</p>
              <a href="${sitePath(site, "/archive/")}" class="inline-link">Archive</a>
            </div>
            ${renderHomeFeaturedEntry(latest)}
            ${archivePosts.length > 0 ? `<div class="home-archive-list">${archivePosts.map((post) => renderHomeArchiveRow(post)).join("")}</div>` : ""}
          </section>

          ${interviews.length > 0 ? renderHomeInterviewSections(interviewSections) : ""}
          ${elsewhere.length > 0 ? renderElsewhereSection(elsewhere) : ""}
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
    openGraphType: "website",
    content: `
      <div class="page-shell">
        ${renderHeader(site)}
        <main class="content archive-content">
          <section class="archive-hero">
            <p class="eyebrow">Archive</p>
            <h1>Published writing</h1>
            <p class="intro">Every essay, note, and long-form argument in one place.</p>
          </section>

          ${years
            .map((year) => {
              return `
                <section class="year-group">
                  <div class="year-heading">${year}</div>
                  <div class="entry-list">
                    ${postsByYear[year].map((post) => renderEntryRow(post)).join("")}
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
  const toc = renderTableOfContents(post);
  return renderDocument({
    site,
    title: `${post.title} | ${site.siteTitle}`,
    description: post.description,
    pathName: `/posts/${post.slug}/`,
    imagePath: post.image,
    imageAlt: post.imageAlt,
    bodyClass: "post-page",
    openGraphType: "article",
    publishedDate: post.date,
    content: `
      <div class="page-shell">
        ${renderHeader(site)}
        <main class="content">
          <article class="essay">
            <nav class="breadcrumb">
              <a href="${sitePath(site, "/")}">Home</a>
              <span>/</span>
              <a href="${sitePath(site, "/archive/")}">Archive</a>
            </nav>
            <header class="essay-header">
              <p class="eyebrow">${escapeHtml(post.category)}</p>
              <h1>${renderDisplayTitle(post.displayTitle)}</h1>
              <p class="dek">${escapeHtml(post.description)}</p>
              <div class="essay-meta-row">
                <div class="meta">
                  <span>${formatDate(post.date)}</span>
                  <span>${post.readingMinutes} min read</span>
                  <span>${post.wordCount} words</span>
                </div>
                <button class="share-button" type="button" data-share-button data-share-url="${escapeAttribute(absoluteUrl(site.domain, sitePath(site, `/posts/${post.slug}/`)))}" data-share-title="${escapeAttribute(post.title)}">Share</button>
              </div>
            </header>
            <div class="essay-layout">
              ${toc}
              <div class="essay-main">
                ${renderSummary(post)}
                ${renderArticleImage(post)}
                <div class="article-body">
                  ${post.bodyHtml}
                </div>
              </div>
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
    openGraphType: "website",
    content: `
      <div class="page-shell">
        ${renderHeader(site)}
        <main class="content">
          <section class="not-found">
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

function renderDocument({ site, title, description, pathName, imagePath, imageAlt = "", content, bodyClass, openGraphType = "website", publishedDate = "" }) {
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
    <meta property="og:site_name" content="${escapeAttribute(site.siteTitle)}">
    <meta property="og:title" content="${escapeAttribute(title)}">
    <meta property="og:description" content="${escapeAttribute(description)}">
    <meta property="og:type" content="${escapeAttribute(openGraphType)}">
    <meta property="og:url" content="${escapeAttribute(canonical)}">
    ${ogImage ? `<meta property="og:image" content="${escapeAttribute(ogImage)}">` : ""}
    ${ogImage && imageAlt ? `<meta property="og:image:alt" content="${escapeAttribute(imageAlt)}">` : ""}
    ${publishedDate ? `<meta property="article:published_time" content="${escapeAttribute(`${publishedDate}T12:00:00Z`)}">` : ""}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttribute(title)}">
    <meta name="twitter:description" content="${escapeAttribute(description)}">
    ${ogImage ? `<meta name="twitter:image" content="${escapeAttribute(ogImage)}">` : ""}
    ${ogImage && imageAlt ? `<meta name="twitter:image:alt" content="${escapeAttribute(imageAlt)}">` : ""}
    <meta name="theme-color" content="#f4ecdf">
    <link rel="icon" type="image/svg+xml" href="${sitePath(site, "/favicon.svg")}">
    <script>
      (() => {
        const storageKey = "vikram-theme";
        const root = document.documentElement;
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        const storedTheme = localStorage.getItem(storageKey);
        const activeTheme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : systemTheme;
        root.dataset.theme = activeTheme;
        if (themeMeta) {
          themeMeta.setAttribute("content", activeTheme === "dark" ? "#12100d" : "#f4ecdf");
        }
      })();
    </script>
    <link rel="stylesheet" href="${sitePath(site, "/styles.css")}">
  </head>
  <body class="${escapeAttribute(bodyClass)}">
    ${content}
    <script>
      (() => {
        const storageKey = "vikram-theme";
        const root = document.documentElement;
        const button = document.querySelector("[data-theme-toggle]");
        const shareButton = document.querySelector("[data-share-button]");
        const themeMeta = document.querySelector('meta[name="theme-color"]');

        if (button) {
          const applyTheme = (theme) => {
            root.dataset.theme = theme;
            button.dataset.themeState = theme;
            button.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
            button.querySelector("[data-theme-label]").textContent = theme === "dark" ? "Light" : "Dark";
            if (themeMeta) {
              themeMeta.setAttribute("content", theme === "dark" ? "#12100d" : "#f4ecdf");
            }
          };

          applyTheme(root.dataset.theme || "light");

          button.addEventListener("click", () => {
            const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
            localStorage.setItem(storageKey, nextTheme);
            applyTheme(nextTheme);
          });
        }

        if (shareButton) {
          shareButton.addEventListener("click", async () => {
            const url = shareButton.dataset.shareUrl || window.location.href;
            const title = shareButton.dataset.shareTitle || document.title;
            const previousLabel = shareButton.textContent;

            try {
              if (navigator.share) {
                await navigator.share({ title, url });
              } else {
                await navigator.clipboard.writeText(url);
                shareButton.textContent = "Copied";
                window.setTimeout(() => {
                  shareButton.textContent = previousLabel;
                }, 1600);
              }
            } catch (error) {
              if (error && error.name === "AbortError") {
                return;
              }
              try {
                await navigator.clipboard.writeText(url);
                shareButton.textContent = "Copied";
                window.setTimeout(() => {
                  shareButton.textContent = previousLabel;
                }, 1600);
              } catch (_) {
                shareButton.textContent = previousLabel;
              }
            }
          });
        }

        const tocLinks = Array.from(document.querySelectorAll(".essay-toc a[href^='#']"));
        const tocSections = tocLinks
          .map((link) => {
            const id = link.getAttribute("href")?.slice(1);
            const section = id ? document.getElementById(id) : null;
            return section ? { link, section } : null;
          })
          .filter(Boolean);

        if (tocSections.length > 0 && "IntersectionObserver" in window) {
          let activeId = "";

          const setActive = (id) => {
            if (!id || id === activeId) {
              return;
            }

            activeId = id;
            for (const item of tocSections) {
              const isActive = item.section.id === id;
              item.link.classList.toggle("is-active", isActive);
              item.link.setAttribute("aria-current", isActive ? "true" : "false");
            }
          };

          const observer = new IntersectionObserver(
            (entries) => {
              const visibleEntries = entries
                .filter((entry) => entry.isIntersecting)
                .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);

              if (visibleEntries.length > 0) {
                setActive(visibleEntries[0].target.id);
              }
            },
            {
              rootMargin: "-18% 0px -62% 0px",
              threshold: [0, 0.2, 0.6, 1]
            }
          );

          for (const item of tocSections) {
            observer.observe(item.section);
          }

          setActive(tocSections[0].section.id);
        }
      })();
    </script>
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
      <div class="site-header-actions">
      <nav class="site-nav" aria-label="Primary">
        <a href="${sitePath(site, "/archive/")}">Archive</a>
      </nav>
      <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch color theme">
        <span class="theme-toggle-mark" aria-hidden="true"></span>
        <span data-theme-label>Dark</span>
      </button>
      </div>
    </header>
  `;
}

function renderFooter(site) {
  return `
    <footer class="site-footer">
      <p>${escapeHtml(site.footerNote)}</p>
      <p class="footer-note"><a href="${sitePath(site, "/archive/")}">Archive</a></p>
    </footer>
  `;
}

function renderEntryRow(post) {
  return `
    <article class="entry-row">
      <div class="entry-copy">
        <div class="entry-meta">
          <span>${escapeHtml(post.category)}</span>
          <span>${formatDate(post.date)}</span>
          <span>${post.readingMinutes} min read</span>
        </div>
        <h2 class="entry-title"><a href="${sitePath(post.site, `/posts/${post.slug}/`)}">${renderDisplayTitle(post.displayTitle)}</a></h2>
        <p class="entry-description">${escapeHtml(post.description)}</p>
      </div>
      ${renderEntryVisual(post, "entry-thumb")}
      <div class="entry-side">
        <a class="entry-link" href="${sitePath(post.site, `/posts/${post.slug}/`)}">${entryLinkLabel(post)}</a>
      </div>
    </article>
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

function renderHomeFeaturedEntry(post) {
  return `
    <article class="home-featured-entry">
      <div class="home-featured-copy">
        <div class="entry-meta">
          <span>${formatDate(post.date)}</span>
          <span>${post.readingMinutes} min read</span>
        </div>
        <h2 class="home-featured-title"><a href="${sitePath(post.site, `/posts/${post.slug}/`)}">${renderDisplayTitle(post.displayTitle)}</a></h2>
        <p class="home-featured-description">${escapeHtml(post.description)}</p>
      </div>
      ${renderEntryVisual(post, "home-featured-visual")}
    </article>
  `;
}

function renderHomeArchiveRow(post) {
  return `
    <article class="home-archive-row">
      <div class="home-archive-date">${formatDate(post.date)}</div>
      <div class="home-archive-copy">
        <h3><a href="${sitePath(post.site, `/posts/${post.slug}/`)}">${renderDisplayTitle(post.displayTitle)}</a></h3>
        <p>${escapeHtml(post.description)}</p>
      </div>
      ${renderEntryVisual(post, "home-archive-visual")}
    </article>
  `;
}

function renderEntryVisual(post, className) {
  const visualPath = entryVisualPath(post);
  const altText = post.articleImageAlt || post.imageAlt;

  if (!visualPath) {
    return "";
  }

  return `
    <a class="${className}" href="${sitePath(post.site, `/posts/${post.slug}/`)}" aria-label="Open ${escapeAttribute(post.title)}">
      <img src="${escapeAttribute(sitePath(post.site, visualPath))}" alt="${escapeAttribute(altText)}" loading="lazy">
    </a>
  `;
}

function entryVisualPath(post) {
  if (post.articleImage) {
    return post.articleImage;
  }

  if (post.image) {
    return post.image.replace("-preview.", "-cover.");
  }

  return "";
}

function renderHomeInterviewSections(sections) {
  const sectionEntries = Object.entries(sections).filter(([, items]) =>
    items.some((interview) => String(interview.videoId || "").trim())
  );

  if (sectionEntries.length === 0) {
    return "";
  }

  return sectionEntries
    .map(([sectionTitle, items], index) => renderHomeInterviewsSection(sectionTitle, items, index === 0))
    .join("");
}

function renderHomeInterviewsSection(sectionTitle, interviews, includeIntro = false) {
  const validInterviews = interviews.filter((interview) => String(interview.videoId || "").trim());

  if (validInterviews.length === 0) {
    return "";
  }

  return `
    <section class="home-interviews">
      <div class="home-section-head">
        <p class="home-label">${escapeHtml(sectionTitle)}</p>
      </div>
      ${includeIntro ? `<p class="home-interviews-intro">Conversations on company building, leadership, and staying steady while the stakes rise.</p>` : ""}
      <div class="interview-grid">
        ${validInterviews.map((interview) => renderHomeInterviewCard(interview)).join("")}
      </div>
    </section>
  `;
}

function renderHomeInterviewCard(interview) {
  const videoId = String(interview.videoId || "").trim();

  if (!videoId) {
    return "";
  }

  const title = interview.title || "Interview";
  const host = interview.host || "";
  const description = interview.description || "";
  const meta = [host, interview.date ? formatDate(interview.date) : ""].filter(Boolean).join(" • ");
  const watchUrl = interview.url || `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;

  return `
    <article class="interview-card">
      <div class="interview-video">
        <iframe
          src="${escapeAttribute(embedUrl)}"
          title="${escapeAttribute(title)}"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
      ${meta ? `<p class="interview-meta">${escapeHtml(meta)}</p>` : ""}
      <h3 class="interview-title">${escapeHtml(title)}</h3>
      ${description ? `<p class="interview-description">${escapeHtml(description)}</p>` : ""}
      <p class="interview-action"><a class="inline-link" href="${escapeAttribute(watchUrl)}" target="_blank" rel="noreferrer">Watch on YouTube</a></p>
    </article>
  `;
}

function renderElsewhereSection(items) {
  const validItems = items.filter((item) => String(item.url || "").trim());

  if (validItems.length === 0) {
    return "";
  }

  return `
    <section class="home-elsewhere">
      <div class="home-section-head">
        <p class="home-label">Elsewhere</p>
      </div>
      <p class="home-elsewhere-intro">Interviews, essays, and conversations published outside this site that still feel central to the work.</p>
      <div class="elsewhere-list">
        ${validItems.map((item) => renderElsewhereRow(item)).join("")}
      </div>
    </section>
  `;
}

function renderElsewhereRow(item) {
  const meta = [item.type || "", item.source || "", item.date ? formatDate(item.date) : ""].filter(Boolean).join(" • ");

  return `
    <article class="elsewhere-row">
      ${meta ? `<p class="elsewhere-meta">${escapeHtml(meta)}</p>` : ""}
      <h3 class="elsewhere-title"><a href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title || "Untitled")}</a></h3>
      ${item.description ? `<p class="elsewhere-description">${escapeHtml(item.description)}</p>` : ""}
    </article>
  `;
}

function entryLinkLabel(post) {
  const category = String(post.category || "").toLowerCase();
  if (category.includes("note")) {
    return "Read notes";
  }
  return "Read essay";
}

function renderDisplayTitle(title) {
  const parts = String(title)
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  return parts.map((part) => renderInline(part)).join("<br>");
}

function renderTableOfContents(post) {
  const allHeadings = post.headings || [];
  const preferredLevel = allHeadings.some((heading) => heading.level === 2) ? 2 : 3;
  const headings = allHeadings.filter((heading) => heading.level === preferredLevel);

  if (headings.length === 0) {
    return "";
  }

  return `
    <aside class="essay-toc" aria-label="Table of contents">
      <p class="essay-toc-label">On this page</p>
      <ol class="essay-toc-list">
        ${headings
          .map((heading) => {
            return `<li class="essay-toc-item essay-toc-level-${heading.level}"><a href="#${escapeAttribute(heading.id)}">${escapeHtml(heading.text)}</a></li>`;
          })
          .join("")}
      </ol>
    </aside>
  `;
}

function renderSummary(post) {
  const items = String(post.summary || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    return "";
  }

  return `
    <section class="essay-summary" aria-label="Essay summary">
      <p class="essay-summary-label">In Brief</p>
      <ul>
        ${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderArticleImage(post) {
  if (!post.articleImage) {
    return "";
  }

  return `
    <figure class="article-visual">
      <img src="${escapeAttribute(sitePath(post.site, post.articleImage))}" alt="${escapeAttribute(post.articleImageAlt)}">
    </figure>
  `;
}

function stripFormatting(text) {
  return String(text).replace(/[*_`]/g, "").trim();
}

function slugifyHeading(text, headings) {
  const base = stripFormatting(text)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

  let slug = base;
  let counter = 2;

  while (headings.some((heading) => heading.id === slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
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
