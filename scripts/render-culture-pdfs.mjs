import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const rootDir = process.cwd();
const translationsDir = path.join(rootDir, "content", "culture-docs", "translations");
const outputDir = path.join(rootDir, "src", "media", "docs");

const LANGUAGES = [
  { code: "hi", htmlLang: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "mr", htmlLang: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { code: "gu", htmlLang: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી" },
  { code: "bn", htmlLang: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "ta", htmlLang: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "te", htmlLang: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "kn", htmlLang: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { code: "ml", htmlLang: "ml", label: "Malayalam", nativeLabel: "മലയാളം" },
  { code: "pa", htmlLang: "pa", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ" },
  { code: "or", htmlLang: "or", label: "Odia", nativeLabel: "ଓଡ଼ିଆ" }
];

const DOCS = [
  {
    id: "flatland",
    title: "Flatland",
    sourceFile: "flatland.md",
    outputBase: "flatland",
    dek: "An operating note for a flatter, faster Cars24."
  },
  {
    id: "values",
    title: "Our Values",
    sourceFile: "cars24-values.md",
    outputBase: "cars24-values",
    dek: "How Cars24 works, decides, and holds the bar."
  }
];

const args = new Set(process.argv.slice(2));
const requestedLanguageCodes = LANGUAGES.filter((language) => args.has(language.code)).map((language) => language.code);
const requestedDocIds = DOCS.filter((doc) => args.has(doc.id)).map((doc) => doc.id);
const requestedLanguages = requestedLanguageCodes.length > 0
  ? LANGUAGES.filter((language) => requestedLanguageCodes.includes(language.code))
  : LANGUAGES;
const requestedDocs = requestedDocIds.length > 0
  ? DOCS.filter((doc) => requestedDocIds.includes(doc.id))
  : DOCS;

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  for (const language of requestedLanguages) {
    for (const doc of requestedDocs) {
      const markdownPath = path.join(translationsDir, language.code, doc.sourceFile);
      const markdown = await fs.readFile(markdownPath, "utf8");
      const outputPath = path.join(outputDir, `${doc.outputBase}-${language.code}.pdf`);

      const page = await browser.newPage({
        viewport: { width: 1240, height: 1754 },
        deviceScaleFactor: 1
      });

      await page.setContent(renderPdfHtml({ doc, language, markdown }), { waitUntil: "networkidle" });
      await page.emulateMedia({ media: "print" });
      await page.pdf({
        path: outputPath,
        format: "A4",
        printBackground: true,
        preferCSSPageSize: false,
        margin: {
          top: "18mm",
          right: "17mm",
          bottom: "19mm",
          left: "17mm"
        },
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: `
          <div style="width:100%; padding:0 17mm; color:#8d8276; font:9px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <span>${escapeHtml(doc.title)} - ${escapeHtml(language.nativeLabel)}</span>
            <span style="float:right;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
          </div>
        `
      });

      await page.close();
      console.log(`wrote ${path.relative(rootDir, outputPath)}`);
    }
  }
} finally {
  await browser.close();
}

function renderPdfHtml({ doc, language, markdown }) {
  const cleanMarkdown = String(markdown || "").replace(/\r/g, "").trim();
  const bodyMarkdown = cleanMarkdown.replace(/^#\s+.+(?:\n|$)/, "").trim();

  return `<!doctype html>
<html lang="${escapeAttribute(language.htmlLang)}">
  <head>
    <meta charset="utf-8">
    <style>
      :root {
        --paper: #fbf7ef;
        --ink: #191510;
        --muted: #746a5f;
        --line: #ded3c5;
        --accent: #a45c37;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        background: var(--paper);
        color: var(--ink);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Kannada", "Noto Sans Malayalam", "Noto Sans Bengali", "Noto Sans Gujarati", "Noto Sans Gurmukhi", "Noto Sans Oriya", sans-serif;
        font-size: 13.4px;
        line-height: 1.66;
      }

      body {
        padding: 0;
      }

      .cover {
        min-height: 72vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        border-bottom: 1px solid var(--line);
        page-break-after: always;
      }

      .brand {
        margin: 0 0 38mm;
        color: var(--accent);
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0 0 0.4em;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 44px;
        font-weight: 500;
        letter-spacing: -0.03em;
        line-height: 0.98;
      }

      .dek {
        max-width: 31rem;
        margin: 0 0 2rem;
        color: var(--muted);
        font-size: 15px;
      }

      .meta {
        color: var(--muted);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      main {
        max-width: 42rem;
      }

      h2,
      h3 {
        page-break-after: avoid;
      }

      h2 {
        margin: 2.4rem 0 0.8rem;
        padding-top: 1rem;
        border-top: 1px solid var(--line);
        font-family: Georgia, "Times New Roman", serif;
        font-size: 24px;
        font-weight: 500;
        line-height: 1.15;
      }

      h3 {
        margin: 1.55rem 0 0.55rem;
        font-size: 15px;
        line-height: 1.3;
      }

      p {
        margin: 0 0 0.85rem;
      }

      strong {
        font-weight: 700;
      }

      ul {
        margin: 0 0 1rem 1.2rem;
        padding: 0;
      }

      li {
        margin: 0 0 0.35rem;
      }

      hr {
        margin: 1.5rem 0;
        border: 0;
        border-top: 1px solid var(--line);
      }

      blockquote {
        margin: 1.1rem 0;
        padding: 0.75rem 0 0.75rem 1rem;
        border-left: 3px solid var(--accent);
        color: var(--muted);
      }

      blockquote p:last-child {
        margin-bottom: 0;
      }

      pre {
        max-width: 100%;
        overflow: hidden;
        white-space: pre-wrap;
        margin: 1rem 0;
        padding: 0.8rem;
        border: 1px solid var(--line);
        border-radius: 8px;
        color: var(--muted);
        font: 9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        line-height: 1.35;
      }
    </style>
  </head>
  <body>
    <section class="cover">
      <p class="brand">Cars24 Culture</p>
      <h1>${escapeHtml(doc.title)}</h1>
      <p class="dek">${escapeHtml(doc.dek)}</p>
      <p class="meta">Claude translated - ${escapeHtml(language.nativeLabel)} / ${escapeHtml(language.label)}</p>
    </section>
    <main>
      ${markdownToHtml(bodyMarkdown)}
    </main>
  </body>
</html>`;
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push("<hr>");
      index += 1;
      continue;
    }

    if (/^##\s+/.test(line)) {
      blocks.push(`<h2>${renderInline(line.replace(/^##\s+/, ""))}</h2>`);
      index += 1;
      continue;
    }

    if (/^###\s+/.test(line)) {
      blocks.push(`<h3>${renderInline(line.replace(/^###\s+/, ""))}</h3>`);
      index += 1;
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

    if (/^>\s?/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(`<blockquote><p>${renderInline(quoteLines.join(" "))}</p></blockquote>`);
      continue;
    }

    const paragraphLines = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^#{2,3}\s+/.test(lines[index]) &&
      !/^[-*]\s+/.test(lines[index]) &&
      !/^>\s?/.test(lines[index]) &&
      !/^---+$/.test(lines[index].trim())
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    const text = paragraphLines.join("\n");
    if (looksLikeGrid(paragraphLines)) {
      blocks.push(`<pre>${escapeHtml(text)}</pre>`);
    } else {
      blocks.push(`<p>${renderInline(paragraphLines.join(" "))}</p>`);
    }
  }

  return blocks.join("\n");
}

function looksLikeGrid(lines) {
  return lines.length >= 3 && lines.every((line) => /^[A-Z\s]+$/.test(line) && line.trim().length >= 20);
}

function renderInline(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
