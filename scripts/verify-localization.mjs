import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "content");
const postsDir = path.join(contentDir, "posts");
const siteTranslationsDir = path.join(contentDir, "site-translations");
const distDir = path.join(rootDir, "dist");
const sourceDocsDir = path.join(rootDir, "src", "media", "docs");
const distDocsDir = path.join(distDir, "media", "docs");

const targetLanguages = [
  { code: "hi", htmlLang: "hi", requiresNonAscii: true },
  { code: "hinglish", htmlLang: "hi-Latn", requiresNonAscii: false },
  { code: "mr", htmlLang: "mr", requiresNonAscii: true },
  { code: "gu", htmlLang: "gu", requiresNonAscii: true },
  { code: "bn", htmlLang: "bn", requiresNonAscii: true },
  { code: "ta", htmlLang: "ta", requiresNonAscii: true },
  { code: "te", htmlLang: "te", requiresNonAscii: true },
  { code: "kn", htmlLang: "kn", requiresNonAscii: true },
  { code: "ml", htmlLang: "ml", requiresNonAscii: true },
  { code: "pa", htmlLang: "pa", requiresNonAscii: true },
  { code: "or", htmlLang: "or", requiresNonAscii: true }
];

const allLanguages = [
  { code: "en", htmlLang: "en" },
  ...targetLanguages
];

const cultureDocs = [
  {
    id: "flatland",
    slug: "flatland",
    fileBase: "flatland",
    pages: "33",
    pageSizePattern: /^612 x 792 pts \(letter\)$/i,
    minBytes: 1_000_000
  },
  {
    id: "values",
    slug: "values",
    fileBase: "cars24-values",
    pages: "22",
    pageSizePattern: /^594\.96 x 841\.92 pts \(A4\)$/i,
    minBytes: 1_000_000
  }
];

async function main() {
  const errors = [];
  const site = await readSiteConfig(errors);
  const postFiles = await listPostFiles(errors);

  const translationSourcesComplete = await auditTranslationSources({ postFiles, errors });
  await auditGeneratedRoutes({ postFiles, errors, requireAllLanguages: translationSourcesComplete, domain: site?.domain || "" });
  await auditCultureRedirects({ errors, requireAllLanguages: translationSourcesComplete });
  await auditLocalizedSitemap({ postFiles, errors, requireAllLanguages: translationSourcesComplete, domain: site?.domain || "" });
  auditRegionalPdfs({ errors });

  if (errors.length > 0) {
    console.error("Localization verification failed.\n");
    for (const error of errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Localization verification passed for ${targetLanguages.length} language(s), ${postFiles.length} post(s), and ${targetLanguages.length * cultureDocs.length} regional PDF(s).`
  );
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

async function auditTranslationSources({ postFiles, errors }) {
  const startErrorCount = errors.length;

  for (const language of targetLanguages) {
    const missing = [];
    const sitePath = path.join(siteTranslationsDir, language.code, "site.json");
    const siteRaw = await readOptional(sitePath);

    if (!siteRaw) {
      missing.push(`content/site-translations/${language.code}/site.json`);
    } else {
      try {
        JSON.parse(siteRaw);
      } catch (error) {
        errors.push(`${language.code}: invalid site.json (${error.message})`);
      }
      auditTranslatedText({
        label: `${language.code}/site.json`,
        raw: siteRaw,
        sourceRaw: "",
        language,
        errors
      });
    }

    for (const file of postFiles) {
      const sourcePath = path.join(postsDir, file);
      const translatedPath = path.join(siteTranslationsDir, language.code, "posts", file);
      const sourceRaw = await readOptional(sourcePath);
      const translatedRaw = await readOptional(translatedPath);

      if (!translatedRaw) {
        missing.push(`content/site-translations/${language.code}/posts/${file}`);
        continue;
      }

      auditTranslatedText({
        label: `${language.code}/posts/${file}`,
        raw: translatedRaw,
        sourceRaw,
        language,
        errors
      });

      const sourceFrontMatter = parseFrontMatter(sourceRaw);
      const translatedFrontMatter = parseFrontMatter(translatedRaw);
      if (!translatedFrontMatter.body.trim()) {
        errors.push(`${language.code}/posts/${file}: translated body is empty`);
      }
      if (sourceFrontMatter.attributes.slug && translatedFrontMatter.attributes.slug !== sourceFrontMatter.attributes.slug) {
        errors.push(`${language.code}/posts/${file}: slug changed from ${sourceFrontMatter.attributes.slug} to ${translatedFrontMatter.attributes.slug || "(missing)"}`);
      }
      if (sourceFrontMatter.attributes.date && translatedFrontMatter.attributes.date !== sourceFrontMatter.attributes.date) {
        errors.push(`${language.code}/posts/${file}: date changed from ${sourceFrontMatter.attributes.date} to ${translatedFrontMatter.attributes.date || "(missing)"}`);
      }
    }

    if (missing.length > 0) {
      errors.push(`${language.code}: missing ${missing.length} translation source file(s): ${formatListPreview(missing)}`);
    }
  }

  return errors.length === startErrorCount;
}

function auditTranslatedText({ label, raw, sourceRaw, language, errors }) {
  if (raw.trim().length < 200) {
    errors.push(`${label}: translated content is unexpectedly short`);
  }
  if (sourceRaw && stripComparableText(raw) === stripComparableText(sourceRaw)) {
    errors.push(`${label}: translated content is identical to the English source`);
  }
  if (language.requiresNonAscii && !/[^\x00-\x7F]/.test(raw)) {
    errors.push(`${label}: expected native-script text but found ASCII-only content`);
  }
}

async function auditGeneratedRoutes({ postFiles, errors, requireAllLanguages, domain }) {
  const baseRoutes = [
    { pathName: "/", relativeFile: "index.html" },
    { pathName: "/archive/", relativeFile: path.join("archive", "index.html") },
    { pathName: "/subscribe/", relativeFile: path.join("subscribe", "index.html") },
    ...postFiles.map((file) => {
      const slug = file.replace(/\.md$/, "");
      return {
        pathName: `/posts/${slug}/`,
        relativeFile: path.join("posts", slug, "index.html")
      };
    })
  ];
  const languagesToAudit = requireAllLanguages ? allLanguages : [allLanguages[0]];

  for (const language of languagesToAudit) {
    for (const route of baseRoutes) {
      const relativeFile = language.code === "en"
        ? route.relativeFile
        : path.join(language.code, route.relativeFile);
      const html = await readGenerated(relativeFile, errors);
      if (!html) {
        continue;
      }

      const label = `${language.code}:${route.pathName}`;
      const expectedLang = language.htmlLang;
      const actualLang = getHtmlLang(html);
      if (actualLang !== expectedLang) {
        errors.push(`${label}: expected html lang ${expectedLang}, found ${actualLang || "(missing)"}`);
      }

      const selectCount = countMatches(html, /<select\b[^>]*data-language-select/gi);
      if (selectCount !== 1) {
        errors.push(`${label}: expected one masthead language selector, found ${selectCount}`);
      }

      if (requireAllLanguages) {
        const optionValues = [...html.matchAll(/<option\b[^>]*value="([^"]+)"/gi)].map((match) => match[1]);
        const expectedValues = languageTargetsForRoute(route.pathName);
        if (JSON.stringify(optionValues) !== JSON.stringify(expectedValues)) {
          errors.push(`${label}: language selector targets mismatch; expected ${expectedValues.join(", ")} but found ${optionValues.join(", ")}`);
        }
        auditHreflangAlternates({
          html,
          label,
          expectedPaths: expectedValues,
          domain,
          errors
        });
      }
    }
  }

  const htmlFiles = await listGeneratedHtmlFiles(errors);
  for (const file of htmlFiles) {
    const html = await fs.readFile(file, "utf8");
    const relativeFile = path.relative(distDir, file);
    if (/Read online/i.test(html)) {
      errors.push(`${relativeFile}: contains deprecated Read online link`);
    }
    if (/language-pill|language-module/i.test(html)) {
      errors.push(`${relativeFile}: contains deprecated language selector UI`);
    }
  }
}

function auditHreflangAlternates({ html, label, expectedPaths, domain, errors }) {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) {
    return;
  }

  const alternates = [...html.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/gi)]
    .map((match) => ({ hreflang: match[1], href: match[2] }));
  const expected = allLanguages.map((language, index) => ({
    hreflang: language.htmlLang,
    href: `${normalizedDomain}${expectedPaths[index]}`
  }));
  expected.push({
    hreflang: "x-default",
    href: `${normalizedDomain}${expectedPaths[0]}`
  });

  if (alternates.length !== expected.length) {
    errors.push(`${label}: expected ${expected.length} hreflang alternate(s), found ${alternates.length}`);
  }

  for (const expectedAlternate of expected) {
    const actual = alternates.find((alternate) => alternate.hreflang === expectedAlternate.hreflang);
    if (!actual) {
      errors.push(`${label}: missing hreflang ${expectedAlternate.hreflang}`);
      continue;
    }
    if (actual.href !== expectedAlternate.href) {
      errors.push(`${label}: hreflang ${expectedAlternate.hreflang} points to ${actual.href}, expected ${expectedAlternate.href}`);
    }
  }
}

async function auditCultureRedirects({ errors, requireAllLanguages }) {
  const languages = [
    { code: "en", prefix: "" },
    ...(requireAllLanguages ? targetLanguages.map((language) => ({ code: language.code, prefix: language.code })) : [])
  ];

  for (const language of languages) {
    for (const doc of cultureDocs) {
      const relativeFile = language.code === "en"
        ? path.join("culture", doc.slug, "index.html")
        : path.join(language.prefix, "culture", doc.slug, "index.html");
      const html = await readGenerated(relativeFile, errors);
      if (!html) {
        continue;
      }

      const expectedPdf = language.code === "en"
        ? `/media/docs/${doc.fileBase}.pdf`
        : `/media/docs/${doc.fileBase}-${language.code}.pdf`;
      if (!html.includes(expectedPdf)) {
        errors.push(`${relativeFile}: redirect does not point at ${expectedPdf}`);
      }
      if (!/meta name="robots" content="noindex"/i.test(html)) {
        errors.push(`${relativeFile}: redirect page should be noindex`);
      }
    }
  }
}

async function auditLocalizedSitemap({ postFiles, errors, requireAllLanguages, domain }) {
  if (!requireAllLanguages) {
    return;
  }

  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) {
    return;
  }

  const xml = await readGenerated("sitemap.xml", errors);
  if (!xml) {
    return;
  }

  const urls = new Set([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]));
  const basePaths = [
    "/",
    "/archive/",
    "/subscribe/",
    ...postFiles.map((file) => `/posts/${file.replace(/\.md$/, "")}/`)
  ];

  for (const basePath of basePaths) {
    for (const pathName of languageTargetsForRoute(basePath)) {
      const expected = `${normalizedDomain}${pathName}`;
      if (!urls.has(expected)) {
        errors.push(`sitemap.xml: missing localized URL ${expected}`);
      }
    }
  }

  const culturePdfUrls = [
    "/media/docs/flatland.pdf",
    "/media/docs/cars24-values.pdf",
    ...targetLanguages.flatMap((language) => [
      `/media/docs/flatland-${language.code}.pdf`,
      `/media/docs/cars24-values-${language.code}.pdf`
    ])
  ];

  for (const pathName of culturePdfUrls) {
    const expected = `${normalizedDomain}${pathName}`;
    if (!urls.has(expected)) {
      errors.push(`sitemap.xml: missing culture PDF URL ${expected}`);
    }
  }
}

function auditRegionalPdfs({ errors }) {
  for (const language of targetLanguages) {
    for (const doc of cultureDocs) {
      const fileName = `${doc.fileBase}-${language.code}.pdf`;
      const sourcePath = path.join(sourceDocsDir, fileName);
      const distPath = path.join(distDocsDir, fileName);

      for (const filePath of [sourcePath, distPath]) {
        if (!exists(filePath)) {
          errors.push(`missing ${path.relative(rootDir, filePath)}`);
          continue;
        }

        const stats = statSync(filePath);
        if (stats.size < doc.minBytes) {
          errors.push(`${path.relative(rootDir, filePath)}: expected visual PDF over ${doc.minBytes} bytes, found ${stats.size}`);
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

function languageTargetsForRoute(pathName) {
  return allLanguages.map((language) => {
    if (language.code === "en") {
      return pathName;
    }
    return `/${language.code}${pathName === "/" ? "/" : pathName}`;
  });
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

async function readOptional(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
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

function parseFrontMatter(raw) {
  const value = String(raw || "");
  if (!value.startsWith("---\n")) {
    return { attributes: {}, body: value };
  }

  const endIndex = value.indexOf("\n---", 4);
  if (endIndex === -1) {
    return { attributes: {}, body: value };
  }

  const attributes = {};
  const header = value.slice(4, endIndex).trim();
  for (const line of header.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      attributes[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
    }
  }

  return {
    attributes,
    body: value.slice(endIndex + "\n---".length).trim()
  };
}

function stripComparableText(value) {
  return String(value || "")
    .replace(/^---[\s\S]+?---/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getHtmlLang(html) {
  return matchLine(html, /<html\b[^>]*lang="([^"]+)"/i);
}

function matchLine(value, pattern) {
  const match = String(value || "").match(pattern);
  return match ? match[1].trim() : "";
}

function countMatches(value, pattern) {
  return (String(value || "").match(pattern) || []).length;
}

function exists(filePath) {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function formatListPreview(items) {
  const preview = items.slice(0, 5).join(", ");
  const remaining = items.length - 5;
  return remaining > 0 ? `${preview}, and ${remaining} more` : preview;
}

function normalizeDomain(domain) {
  return String(domain || "").replace(/\/$/, "");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
