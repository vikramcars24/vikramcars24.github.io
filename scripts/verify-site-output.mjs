import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "content");
const postsDir = path.join(contentDir, "posts");
const distDir = path.join(rootDir, "dist");
const sourceDocsDir = path.join(rootDir, "src", "media", "docs");
const distDocsDir = path.join(distDir, "media", "docs");
const retiredLanguageCodes = ["hi", "hinglish", "mr", "gu", "bn", "ta", "te", "kn", "ml", "pa", "or"];
const cultureDocs = [
  {
    slug: "flatland",
    fileName: "flatland.pdf",
    pages: "33",
    pageSizePattern: /^612 x 792 pts \(letter\)$/i,
    minBytes: 50_000
  },
  {
    slug: "values",
    fileName: "cars24-values.pdf",
    pages: "22",
    pageSizePattern: /^59[45]\.\d+ x 841\.\d+ pts \(A4\)$/i,
    minBytes: 1_000_000
  }
];

async function main() {
  const errors = [];
  const site = await readSiteConfig(errors);
  const postFiles = await listPostFiles(errors);

  await auditEnglishRoutes({ postFiles, errors });
  await auditCultureRedirects({ errors });
  await auditSitemap({ site, postFiles, errors });
  await auditNoRetiredLanguageOutput({ errors });
  auditEnglishPdfs({ errors });

  if (errors.length > 0) {
    console.error("Site output verification failed.\n");
    for (const error of errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Site output verification passed for English-only output, ${postFiles.length} post(s), and ${cultureDocs.length} PDF(s).`);
}

async function readSiteConfig(errors) {
  try {
    return JSON.parse(await fs.readFile(path.join(contentDir, "site.json"), "utf8"));
  } catch (error) {
    errors.push(`unable to read content/site.json: ${error.message}`);
    return null;
  }
}

async function listPostFiles(errors) {
  try {
    const files = await fs.readdir(postsDir);
    return files
      .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
      .sort();
  } catch (error) {
    errors.push(`unable to read content/posts: ${error.message}`);
    return [];
  }
}

async function auditEnglishRoutes({ postFiles, errors }) {
  const routes = [
    { label: "home", relativeFile: "index.html", expectedLang: "en" },
    { label: "archive", relativeFile: path.join("archive", "index.html"), expectedLang: "en" },
    { label: "subscribe", relativeFile: path.join("subscribe", "index.html"), expectedLang: "en" },
    ...postFiles.map((file) => {
      const slug = file.replace(/\.md$/, "");
      return {
        label: `post:${slug}`,
        relativeFile: path.join("posts", slug, "index.html"),
        expectedLang: "en"
      };
    })
  ];

  for (const route of routes) {
    const html = await readGenerated(route.relativeFile, errors);
    if (!html) {
      continue;
    }

    const actualLang = getHtmlLang(html);
    if (actualLang !== route.expectedLang) {
      errors.push(`${route.label}: expected html lang ${route.expectedLang}, found ${actualLang || "(missing)"}`);
    }

    auditNoRetiredMarkup(route.relativeFile, html, errors);
  }

  const homeHtml = await readGenerated("index.html", errors);
  if (homeHtml) {
    const mainEnd = homeHtml.indexOf("</main>");
    const cultureIndex = homeHtml.indexOf('class="culture-docs"');
    const lastSectionIndex = mainEnd === -1 ? -1 : homeHtml.lastIndexOf("<section", mainEnd);

    if (cultureIndex === -1) {
      errors.push("index.html: missing Flatland and values section");
    } else if (lastSectionIndex !== -1 && lastSectionIndex > cultureIndex) {
      errors.push("index.html: Flatland and values should be the final homepage section");
    }
  }
}

async function auditCultureRedirects({ errors }) {
  for (const doc of cultureDocs) {
    const relativeFile = path.join("culture", doc.slug, "index.html");
    const html = await readGenerated(relativeFile, errors);
    if (!html) {
      continue;
    }

    const expectedPdf = `/media/docs/${doc.fileName}`;
    if (!html.includes(expectedPdf)) {
      errors.push(`${relativeFile}: redirect does not point at ${expectedPdf}`);
    }
    if (!/meta name="robots" content="noindex"/i.test(html)) {
      errors.push(`${relativeFile}: redirect page should be noindex`);
    }
    auditNoRetiredMarkup(relativeFile, html, errors);
  }
}

async function auditSitemap({ site, postFiles, errors }) {
  const domain = String(site?.domain || "").replace(/\/$/, "");
  const xml = await readGenerated("sitemap.xml", errors);
  if (!xml || !domain) {
    return;
  }

  const urls = new Set([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]));
  const expectedPaths = [
    "/",
    "/archive/",
    "/subscribe/",
    ...postFiles.map((file) => `/posts/${file.replace(/\.md$/, "")}/`),
    ...cultureDocs.map((doc) => `/media/docs/${doc.fileName}`)
  ];

  for (const pathName of expectedPaths) {
    const expected = `${domain}${pathName}`;
    if (!urls.has(expected)) {
      errors.push(`sitemap.xml: missing ${expected}`);
    }
  }

  for (const url of urls) {
    if (hasRetiredLanguagePath(new URL(url).pathname)) {
      errors.push(`sitemap.xml: retired language URL still listed ${url}`);
    }
    if (hasRegionalPdfName(url)) {
      errors.push(`sitemap.xml: regional PDF still listed ${url}`);
    }
  }
}

async function auditNoRetiredLanguageOutput({ errors }) {
  for (const code of retiredLanguageCodes) {
    const languageDir = path.join(distDir, code);
    if (exists(languageDir)) {
      errors.push(`dist contains retired language directory ${code}`);
    }
  }

  const htmlFiles = await listGeneratedHtmlFiles(errors);
  for (const file of htmlFiles) {
    const html = await fs.readFile(file, "utf8");
    auditNoRetiredMarkup(path.relative(distDir, file), html, errors);
  }

  for (const docsDir of [sourceDocsDir, distDocsDir]) {
    if (!exists(docsDir)) {
      continue;
    }
    const files = await fs.readdir(docsDir);
    for (const file of files) {
      if (hasRegionalPdfName(file)) {
        errors.push(`${path.relative(rootDir, path.join(docsDir, file))}: regional PDF should not be present`);
      }
    }
  }
}

function auditEnglishPdfs({ errors }) {
  for (const doc of cultureDocs) {
    for (const docsDir of [sourceDocsDir, distDocsDir]) {
      const filePath = path.join(docsDir, doc.fileName);
      if (!exists(filePath)) {
        errors.push(`missing ${path.relative(rootDir, filePath)}`);
        continue;
      }

      const stats = statSync(filePath);
      if (stats.size < doc.minBytes) {
        errors.push(`${path.relative(rootDir, filePath)}: expected PDF over ${doc.minBytes} bytes, found ${stats.size}`);
      }

      const info = pdfInfo(filePath, errors);
      if (!info) {
        continue;
      }
      if (info.pages !== doc.pages) {
        errors.push(`${path.relative(rootDir, filePath)}: expected ${doc.pages} pages, found ${info.pages || "(missing)"}`);
      }
      if (!doc.pageSizePattern.test(info.pageSize || "")) {
        errors.push(`${path.relative(rootDir, filePath)}: unexpected page size ${info.pageSize || "(missing)"}`);
      }
    }
  }
}

function auditNoRetiredMarkup(relativeFile, html, errors) {
  const checks = [
    [/<select\b[^>]*data-language-select/gi, "language selector"],
    [/\blanguage-select\b/gi, "language selector class"],
    [/\blanguage-control\b/gi, "language control class"],
    [/<link\s+rel="alternate"\s+hreflang=/gi, "hreflang alternate"],
    [/Read online/i, "deprecated Read online link"],
    [/language-pill|language-module/i, "deprecated language selector UI"]
  ];

  for (const [pattern, label] of checks) {
    if (pattern.test(html)) {
      errors.push(`${relativeFile}: contains ${label}`);
    }
  }

  for (const code of retiredLanguageCodes) {
    if (html.includes(`/${code}/`)) {
      errors.push(`${relativeFile}: contains retired language path /${code}/`);
    }
  }

  const regionalPdf = html.match(/\/media\/docs\/(?:flatland|cars24-values)-(?:hi|hinglish|mr|gu|bn|ta|te|kn|ml|pa|or)\.pdf/i);
  if (regionalPdf) {
    errors.push(`${relativeFile}: contains regional PDF ${regionalPdf[0]}`);
  }
}

function pdfInfo(filePath, errors) {
  try {
    const output = execFileSync("pdfinfo", [filePath], { encoding: "utf8" });
    return {
      pages: matchLine(output, /^Pages:\s+(.+)$/m),
      pageSize: matchLine(output, /^Page size:\s+(.+)$/m)
    };
  } catch (error) {
    errors.push(`${path.relative(rootDir, filePath)}: pdfinfo failed (${error.message})`);
    return null;
  }
}

async function readGenerated(relativeFile, errors) {
  const filePath = path.join(distDir, relativeFile);
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    errors.push(`missing generated page ${relativeFile}`);
    return "";
  }
}

async function listGeneratedHtmlFiles(errors) {
  try {
    return await listFiles(distDir, (file) => file.endsWith(".html"));
  } catch (error) {
    errors.push(`unable to inspect dist HTML files: ${error.message}`);
    return [];
  }
}

async function listFiles(directory, predicate) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(filePath, predicate));
    } else if (predicate(filePath)) {
      files.push(filePath);
    }
  }

  return files;
}

function hasRetiredLanguagePath(pathName) {
  return retiredLanguageCodes.some((code) => pathName === `/${code}` || pathName.startsWith(`/${code}/`));
}

function hasRegionalPdfName(value) {
  return /(?:^|\/)(?:flatland|cars24-values)-(?:hi|hinglish|mr|gu|bn|ta|te|kn|ml|pa|or)\.pdf(?:$|\?)/i.test(String(value || ""));
}

function getHtmlLang(html) {
  return matchLine(html, /<html\b[^>]*lang="([^"]+)"/i);
}

function matchLine(value, pattern) {
  const match = String(value || "").match(pattern);
  return match ? match[1].trim() : "";
}

function exists(filePath) {
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
