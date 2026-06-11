import { promises as fs, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sitePath = (...parts) => path.join(rootDir, ...parts);
const ogImageWarnKb = Number.parseFloat(process.env.OG_IMAGE_WARN_KB || "250");
const ogImageMaxKb = Number.parseFloat(process.env.OG_IMAGE_MAX_KB || "300");
const requiredRedirects = [
  ["/posts/most-execution-problems-are-trust-problems/", "/posts/execution-problems-begin-as-trust-problems/"],
  ["/posts/the-context-we-refuse-to-see/", "/posts/you-judge-others-by-character-and-yourself-by-circumstance/"],
  ["/posts/ai-may-do-for-consumer-what-saas-did-for-software/", "/posts/ai-will-do-for-consumer-what-saas-did-for-software/"],
  ["/posts/the-car-is-the-artifact-trust-is-the-product/", "/posts/why-we-are-not-selling-cars/"]
];

async function main() {
  const site = JSON.parse(await fs.readFile(sitePath("content", "site.json"), "utf8"));
  const domain = site.domain.replace(/\/$/, "");
  const postSlugs = (await fs.readdir(sitePath("content", "posts")))
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""))
    .sort();

  const pages = [
    { label: "home", file: "index.html", urlPath: "/", type: "website" },
    { label: "archive", file: path.join("archive", "index.html"), urlPath: "/archive/", type: "website" },
    ...postSlugs.map((slug) => ({
      label: slug,
      file: path.join("posts", slug, "index.html"),
      urlPath: `/posts/${slug}/`,
      type: "article"
    }))
  ];

  const errors = [];
  const warnings = [];
  const pageMeta = [];

  for (const page of pages) {
    const html = await readText(page.file, errors);
    if (!html) {
      continue;
    }

    const meta = auditPage({ html, page, domain, errors, warnings });
    pageMeta.push(meta);
  }

  await auditCrossPage({ pageMeta, warnings });
  await auditSitemap({ domain, postSlugs, errors, warnings });
  await auditRss({ domain, postSlugs, errors });
  await auditRobots({ domain, errors });
  await auditRedirects({ domain, errors });
  await auditCname({ domain, errors });

  for (const page of pageMeta) {
    const descriptionLength = page.description.length;
    if (descriptionLength < 40 || descriptionLength > 160) {
      warnings.push(`${page.label}: meta description length is ${descriptionLength}`);
    }

    const titleLength = page.title.length;
    if (titleLength < 10 || titleLength > 70) {
      warnings.push(`${page.label}: title length is ${titleLength}`);
    }
  }

  if (errors.length > 0) {
    console.error("SEO audit failed.\n");
    for (const error of errors) {
      console.error(`ERROR: ${error}`);
    }
    if (warnings.length > 0) {
      console.error("");
      for (const warning of warnings) {
        console.error(`WARN: ${warning}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log(`SEO audit passed for ${pages.length} canonical page(s).`);
  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.log(`WARN: ${warning}`);
    }
  }
}

async function readText(relativeFile, errors) {
  const absoluteFile = sitePath(relativeFile);
  try {
    return await fs.readFile(absoluteFile, "utf8");
  } catch (error) {
    errors.push(`${relativeFile}: missing generated page`);
    return "";
  }
}

function auditPage({ html, page, domain, errors, warnings }) {
  const title = getTitle(html);
  const description = getMeta(html, "description", "name");
  const canonical = getCanonical(html);
  const ogTitle = getMeta(html, "og:title");
  const ogDescription = getMeta(html, "og:description");
  const ogType = getMeta(html, "og:type");
  const ogUrl = getMeta(html, "og:url");
  const ogImage = getMeta(html, "og:image");
  const ogImageWidth = getMeta(html, "og:image:width");
  const ogImageHeight = getMeta(html, "og:image:height");
  const twitterTitle = getMeta(html, "twitter:title", "name");
  const twitterDescription = getMeta(html, "twitter:description", "name");
  const twitterImage = getMeta(html, "twitter:image", "name");
  const h1Count = countMatches(html, /<h1\b/gi);
  const hasJsonLd = /<script type="application\/ld\+json">[\s\S]+?<\/script>/.test(html);

  if (!title) {
    errors.push(`${page.label}: missing <title>`);
  }
  if (!description) {
    errors.push(`${page.label}: missing meta description`);
  }
  if (!canonical) {
    errors.push(`${page.label}: missing canonical URL`);
  }
  if (!ogTitle) {
    errors.push(`${page.label}: missing og:title`);
  }
  if (!ogDescription) {
    errors.push(`${page.label}: missing og:description`);
  }
  if (!twitterTitle) {
    errors.push(`${page.label}: missing twitter:title`);
  }
  if (!twitterDescription) {
    errors.push(`${page.label}: missing twitter:description`);
  }
  if (!ogType) {
    errors.push(`${page.label}: missing og:type`);
  }
  if (!ogUrl) {
    errors.push(`${page.label}: missing og:url`);
  }
  if (h1Count !== 1) {
    errors.push(`${page.label}: expected exactly one <h1>, found ${h1Count}`);
  }
  if (!hasJsonLd) {
    errors.push(`${page.label}: missing JSON-LD structured data`);
  }

  const expectedCanonical = `${domain}${page.urlPath}`;
  if (canonical && canonical !== expectedCanonical) {
    errors.push(`${page.label}: canonical mismatch, expected ${expectedCanonical} but found ${canonical}`);
  }
  if (ogUrl && ogUrl !== expectedCanonical) {
    errors.push(`${page.label}: og:url mismatch, expected ${expectedCanonical} but found ${ogUrl}`);
  }
  if (description && ogDescription && description !== ogDescription && page.label !== "home") {
    warnings.push(`${page.label}: meta description and og:description differ`);
  }
  if (description && twitterDescription && description !== twitterDescription && page.label !== "home") {
    warnings.push(`${page.label}: meta description and twitter:description differ`);
  }
  if (title && ogTitle && title !== ogTitle && page.label !== "home") {
    warnings.push(`${page.label}: <title> and og:title differ`);
  }
  if (ogTitle && twitterTitle && ogTitle !== twitterTitle) {
    warnings.push(`${page.label}: og:title and twitter:title differ`);
  }

  const expectedType = page.type;
  if (ogType && ogType !== expectedType) {
    errors.push(`${page.label}: og:type should be ${expectedType}, found ${ogType}`);
  }
  if (page.type === "article") {
    const published = getMeta(html, "article:published_time");
    if (!published) {
      errors.push(`${page.label}: missing article:published_time`);
    }
  }

  if (ogImage) {
    if (!twitterImage) {
      errors.push(`${page.label}: missing twitter:image`);
    }
    if (!ogImageWidth || !ogImageHeight) {
      errors.push(`${page.label}: missing og:image width/height`);
    }

    const localImagePath = toLocalPath(domain, ogImage);
    if (!localImagePath) {
      errors.push(`${page.label}: og:image is not on the site domain`);
    } else {
      const absoluteImagePath = sitePath(localImagePath);
      if (!existsSyncish(absoluteImagePath)) {
        errors.push(`${page.label}: missing local og:image asset ${localImagePath}`);
      } else {
        const stats = statSync(absoluteImagePath);
        const sizeKb = stats.size / 1024;
        if (sizeKb > ogImageMaxKb) {
          errors.push(`${page.label}: og:image is ${sizeKb.toFixed(1)} KB, above ${ogImageMaxKb} KB budget`);
        } else if (sizeKb > ogImageWarnKb) {
          warnings.push(`${page.label}: og:image is ${sizeKb.toFixed(1)} KB`);
        }
      }
    }
  }

  return {
    label: page.label,
    title,
    description,
    canonical
  };
}

async function auditCrossPage({ pageMeta, warnings }) {
  const seenTitles = new Map();
  const seenCanonicals = new Map();

  for (const page of pageMeta) {
    if (seenTitles.has(page.title)) {
      warnings.push(`${page.label}: duplicates title with ${seenTitles.get(page.title)}`);
    } else {
      seenTitles.set(page.title, page.label);
    }

    if (seenCanonicals.has(page.canonical)) {
      warnings.push(`${page.label}: duplicates canonical with ${seenCanonicals.get(page.canonical)}`);
    } else {
      seenCanonicals.set(page.canonical, page.label);
    }
  }
}

async function auditSitemap({ domain, postSlugs, errors, warnings }) {
  const xml = await fs.readFile(sitePath("sitemap.xml"), "utf8");
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  const expected = [
    `${domain}/`,
    `${domain}/archive/`,
    ...postSlugs.map((slug) => `${domain}/posts/${slug}/`)
  ];

  for (const url of expected) {
    if (!urls.includes(url)) {
      errors.push(`sitemap.xml: missing ${url}`);
    }
  }

  for (const [oldPath] of requiredRedirects) {
    const oldUrl = `${domain}${oldPath}`;
    if (urls.includes(oldUrl)) {
      warnings.push(`sitemap.xml: redirect URL still listed ${oldUrl}`);
    }
  }
}

async function auditRss({ domain, postSlugs, errors }) {
  const xml = await fs.readFile(sitePath("rss.xml"), "utf8");
  for (const slug of postSlugs) {
    const url = `${domain}/posts/${slug}/`;
    if (!xml.includes(url)) {
      errors.push(`rss.xml: missing ${url}`);
    }
  }
}

async function auditRobots({ domain, errors }) {
  const robots = await fs.readFile(sitePath("robots.txt"), "utf8");
  const expected = `Sitemap: ${domain}/sitemap.xml`;
  if (!robots.includes(expected)) {
    errors.push(`robots.txt: missing sitemap reference ${expected}`);
  }
}

async function auditRedirects({ domain, errors }) {
  const redirects = await fs.readFile(sitePath("_redirects"), "utf8");

  for (const [from, to] of requiredRedirects) {
    const line = `${from} ${to} 301`;
    if (!redirects.includes(line)) {
      errors.push(`_redirects: missing ${line}`);
    }

    const redirectHtmlPath = sitePath(from.slice(1), "index.html");
    if (!existsSyncish(redirectHtmlPath)) {
      errors.push(`${from}: missing generated redirect page`);
      continue;
    }

    const html = await fs.readFile(redirectHtmlPath, "utf8");
    const expectedTarget = `${domain}${to}`;
    if (!html.includes(expectedTarget)) {
      errors.push(`${from}: redirect page does not point to ${expectedTarget}`);
    }
  }
}

async function auditCname({ domain, errors }) {
  const expectedHost = new URL(domain).hostname;
  const cname = (await fs.readFile(sitePath("CNAME"), "utf8")).trim();
  if (cname !== expectedHost) {
    errors.push(`CNAME: expected ${expectedHost}, found ${cname}`);
  }
}

function getTitle(html) {
  const match = html.match(/<title>(.*?)<\/title>/i);
  return decodeEntities(match?.[1] || "");
}

function getCanonical(html) {
  const match = html.match(/<link rel="canonical" href="([^"]+)"/i);
  return decodeEntities(match?.[1] || "");
}

function getMeta(html, property, attribute = "property") {
  const escaped = escapeRegex(property);
  const regex = new RegExp(`<meta\\s+${attribute}="${escaped}"\\s+content="([^"]*)"`, "i");
  const match = html.match(regex);
  return decodeEntities(match?.[1] || "");
}

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

function toLocalPath(domain, url) {
  try {
    const parsed = new URL(url);
    const domainHost = new URL(domain).host;
    if (parsed.host !== domainHost) {
      return "";
    }
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    return "";
  }
}

function decodeEntities(value) {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function existsSyncish(filePath) {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
