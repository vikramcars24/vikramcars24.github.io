import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const rootDir = process.cwd();
const translationsDir = path.join(rootDir, "content", "culture-docs", "translations");
const outputDir = path.join(rootDir, "src", "media", "docs");
const tmpDir = path.join(rootDir, "tmp", "culture-pdf-backgrounds");
const CSS_PX_PER_PT = 96 / 72;

const LANGUAGES = [
  { code: "hi", htmlLang: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "hinglish", htmlLang: "hi-Latn", label: "Hinglish", nativeLabel: "Hinglish" },
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
    sourcePdf: "flatland.pdf",
    outputBase: "flatland",
    pageWidth: 918,
    pageHeight: 1188,
    paperWidthPt: 612,
    paperHeightPt: 792,
    pages: 33
  },
  {
    id: "values",
    title: "Our Values",
    sourceFile: "cars24-values.md",
    sourcePdf: "cars24-values.pdf",
    outputBase: "cars24-values",
    pageWidth: 892,
    pageHeight: 1262,
    paperWidthPt: 595.276,
    paperHeightPt: 841.89,
    pages: 22
  }
];

const args = new Set(process.argv.slice(2));
const requireAll = process.env.REQUIRE_ALL_CULTURE_PDFS === "1" || args.has("--require-all");
const requestedLanguageCodes = LANGUAGES.filter((language) => args.has(language.code)).map((language) => language.code);
const requestedDocIds = DOCS.filter((doc) => args.has(doc.id)).map((doc) => doc.id);
const requestedLanguages = requestedLanguageCodes.length > 0
  ? LANGUAGES.filter((language) => requestedLanguageCodes.includes(language.code))
  : LANGUAGES;
const requestedDocs = requestedDocIds.length > 0
  ? DOCS.filter((doc) => requestedDocIds.includes(doc.id))
  : DOCS;

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(tmpDir, { recursive: true });

for (const doc of requestedDocs) {
  await ensureBackgrounds(doc);
  doc.backgrounds = await loadBackgrounds(doc);
}

const browser = await chromium.launch({ headless: true });

try {
  for (const language of requestedLanguages) {
    for (const doc of requestedDocs) {
      const markdownPath = path.join(translationsDir, language.code, doc.sourceFile);
      if (!(await exists(markdownPath))) {
        const message = `missing ${path.relative(rootDir, markdownPath)}`;
        if (requireAll || requestedLanguageCodes.length > 0) {
          throw new Error(message);
        }
        console.warn(`skip ${doc.id}/${language.code}: ${message}`);
        continue;
      }
      const markdown = await fs.readFile(markdownPath, "utf8");
      const outputPath = path.join(outputDir, `${doc.outputBase}-${language.code}.pdf`);
      const cssWidth = cssPageWidth(doc);
      const cssHeight = cssPageHeight(doc);
      const page = await browser.newPage({
        viewport: { width: Math.ceil(cssWidth), height: Math.ceil(cssHeight) },
        deviceScaleFactor: 1
      });

      await page.setContent(renderPdfHtml({ doc, language, markdown }), { waitUntil: "networkidle" });
      await page.emulateMedia({ media: "print" });
      await page.pdf({
        path: outputPath,
        width: `${paperWidthIn(doc)}in`,
        height: `${paperHeightIn(doc)}in`,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
        printBackground: true,
        preferCSSPageSize: true
      });

      await page.close();
      console.log(`wrote ${path.relative(rootDir, outputPath)}`);
    }
  }
} finally {
  await browser.close();
}

async function ensureBackgrounds(doc) {
  const docTmpDir = path.join(tmpDir, doc.id);
  const marker = path.join(docTmpDir, `${doc.id}-${String(doc.pages).padStart(2, "0")}.png`);

  if (await exists(marker)) {
    return;
  }

  await fs.rm(docTmpDir, { recursive: true, force: true });
  await fs.mkdir(docTmpDir, { recursive: true });

  const sourcePdf = path.join(outputDir, doc.sourcePdf);
  const prefix = path.join(docTmpDir, doc.id);
  execFileSync("pdftoppm", ["-png", "-r", "144", sourcePdf, prefix], {
    cwd: rootDir,
    stdio: "inherit"
  });
}

function renderPdfHtml({ doc, language, markdown }) {
  const content = doc.id === "values"
    ? renderValuesPages({ doc, language, markdown })
    : renderFlatlandPages({ doc, language, markdown });
  const cssWidth = cssPageWidth(doc);
  const cssHeight = cssPageHeight(doc);
  const scaleX = cssWidth / doc.pageWidth;
  const scaleY = cssHeight / doc.pageHeight;

  return `<!doctype html>
<html lang="${escapeAttribute(language.htmlLang)}">
  <head>
    <meta charset="utf-8">
    <style>
      @page { size: ${paperWidthIn(doc)}in ${paperHeightIn(doc)}in; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body {
        color: #221f1f;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Kannada", "Noto Sans Malayalam", "Noto Sans Bengali", "Noto Sans Gujarati", "Noto Sans Gurmukhi", "Noto Sans Oriya", sans-serif;
      }
      .page {
        position: relative;
        width: ${cssWidth}px;
        height: ${cssHeight}px;
        overflow: hidden;
        page-break-after: always;
      }
      .page:last-child { page-break-after: auto; }
      .page-canvas {
        position: absolute;
        inset: 0 auto auto 0;
        width: ${doc.pageWidth}px;
        height: ${doc.pageHeight}px;
        transform: scale(${scaleX}, ${scaleY});
        transform-origin: top left;
      }
      .bg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .patch {
        position: absolute;
        background: #fffdf8;
      }
      .patch.warm { background: #faf6ee; }
      .overlay {
        position: absolute;
        color: #221f1f;
        line-height: 1.42;
      }
      .overlay h1,
      .overlay h2,
      .overlay h3,
      .overlay p {
        margin: 0;
      }
      .overlay h1 {
        font-family: Georgia, "Times New Roman", serif;
        font-size: 76px;
        line-height: 0.95;
        letter-spacing: -0.045em;
      }
      .overlay h2 {
        font-size: 34px;
        line-height: 1.08;
        font-weight: 760;
        letter-spacing: -0.02em;
        margin-bottom: 16px;
      }
      .overlay h3 {
        font-size: 26px;
        line-height: 1.18;
        font-weight: 720;
        margin-bottom: 14px;
      }
      .overlay p {
        font-size: 22px;
        line-height: 1.48;
        margin-bottom: 14px;
      }
      .overlay .small {
        font-size: 17px;
        line-height: 1.45;
      }
      .overlay .meta {
        color: #59667f;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 17px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .flatland .overlay h1,
      .flatland .overlay h2 {
        color: #19263f;
        font-family: Georgia, "Times New Roman", serif;
        font-weight: 700;
      }
      .flatland .overlay h2 {
        font-size: 48px;
      }
      .flatland .overlay p {
        color: #191c26;
        font-size: 23px;
        line-height: 1.45;
      }
      .flatland .chunk h2 {
        margin-bottom: 22px;
      }
      .flatland .chunk h3 {
        color: #19263f;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 30px;
      }
      .ribbon-label {
        position: absolute;
        color: #fff;
        font-size: 29px;
        line-height: 1.1;
        font-weight: 430;
        text-shadow: 0 1px 1px rgba(0,0,0,0.12);
      }
    </style>
  </head>
  <body class="${escapeAttribute(doc.id)}">
    ${content}
  </body>
</html>`;
}

function renderValuesPages({ doc, language, markdown }) {
  const parsed = parseMarkdown(markdown);
  const sections = parsed.sections;
  const title = parsed.title || doc.title;
  const subtitle = parsed.leading.find((line) => line.trim()) || "Five values. One way of being.";
  const [sports, customer, own, truth, tolerate, better] = sections;
  const summary = sections.find((section) => /summary|संक्षेप|સારાંશ|सारांश|சுருக்க|సంక్షిప్త|ಸಾರಾಂಶ|ചുരുക്കം|ਸੰਖੇਪ|ସଂକ୍ଷେପ/i.test(section.title)) || sections[sections.length - 2];
  const builder = sections.find((section) => /builder|बिल्डर|બિલ્ડર|বিল্ডার|ಬಿಲ್ಡರ್|ബിൽഡർ|ਬਿਲਡਰ/i.test(section.title)) || sections[sections.length - 1];

  const overlays = new Map([
    [1, valuesCoverOverlay({ title, subtitle, language })],
    [3, valuesTextOverlay(sports, { x: 118, y: 472, w: 660, h: 420 })],
    [5, valuesPhraseOverlay(customer?.subhead || "", { x: 120, y: 500, w: 650, h: 210 })],
    [7, valuesTextOverlay(customer, { x: 110, y: 378, w: 675, h: 520 })],
    [9, valuesTextOverlay(own, { x: 110, y: 330, w: 675, h: 620, compact: true })],
    [11, valuesTextOverlay(truth, { x: 110, y: 330, w: 675, h: 640, compact: true })],
    [13, valuesTextOverlay(tolerate, { x: 110, y: 330, w: 690, h: 640, compact: true })],
    [15, valuesTextOverlay(better, { x: 110, y: 340, w: 675, h: 610, compact: true })],
    [18, valuesTextOverlay(summary, { x: 94, y: 238, w: 700, h: 720, compact: true })],
    [19, valuesTextOverlay(builder, { x: 90, y: 242, w: 710, h: 760, compact: true })]
  ]);

  return Array.from({ length: doc.pages }, (_, index) => {
    const pageNumber = index + 1;
    return renderPage(doc, pageNumber, overlays.get(pageNumber) || "");
  }).join("\n");
}

function valuesCoverOverlay({ title, subtitle, language }) {
  return `
    <div class="patch" style="left:120px; top:315px; width:610px; height:590px;"></div>
    <div class="overlay" style="left:145px; top:340px; width:560px;">
      <h1>${escapeHtml(title)}</h1>
      <p style="font-size:31px; margin-top:28px;">${escapeHtml(stripMarkdown(subtitle))}</p>
      <p class="small" style="margin-top:90px;"><strong>VIKRAM CHOPRA</strong><br>Builder, Cars24</p>
      <p class="meta" style="margin-top:54px;">Claude translated - ${escapeHtml(language.nativeLabel)}</p>
    </div>
  `;
}

function valuesPhraseOverlay(text, box) {
  if (!text) {
    return "";
  }

  return `
    <div class="patch" style="left:${box.x}px; top:${box.y}px; width:${box.w}px; height:${box.h}px;"></div>
    <div class="overlay" style="left:${box.x + 18}px; top:${box.y + 22}px; width:${box.w - 36}px;">
      <h2 style="font-size:54px; line-height:1.08;">${escapeHtml(stripMarkdown(text))}</h2>
    </div>
  `;
}

function valuesTextOverlay(section, box) {
  if (!section) {
    return "";
  }

  const fontSize = box.compact ? 19 : 22;
  return `
    <div class="patch" style="left:${box.x}px; top:${box.y}px; width:${box.w}px; height:${box.h}px;"></div>
    <div class="overlay" style="left:${box.x + 18}px; top:${box.y + 20}px; width:${box.w - 36}px;">
      <h2>${escapeHtml(section.title)}</h2>
      ${section.subhead ? `<h3>${escapeHtml(stripMarkdown(section.subhead))}</h3>` : ""}
      ${section.blocks.map((block) => `<p style="font-size:${fontSize}px;">${renderInline(stripMarkdown(block))}</p>`).join("")}
    </div>
  `;
}

function renderFlatlandPages({ doc, language, markdown }) {
  const parsed = parseMarkdown(markdown);
  const blocks = flattenMarkdown(parsed);
  const chunks = chunkBlocks(blocks, 135);
  const title = parsed.title || doc.title;
  const pages = [];

  pages.push(renderPage(doc, 1, `
    <div class="patch warm" style="left:98px; top:450px; width:610px; height:255px;"></div>
    <div class="overlay flatland" style="left:114px; top:468px; width:560px;">
      <h1>${escapeHtml(title)}</h1>
      <p style="font-family:Georgia, 'Times New Roman', serif; color:#59667f; font-size:28px; margin-top:24px;">${escapeHtml(language.nativeLabel)} / ${escapeHtml(language.label)}</p>
      <p class="meta" style="margin-top:52px;">Claude translated</p>
    </div>
  `));

  for (let index = 2; index <= doc.pages; index += 1) {
    const chunk = chunks[index - 2] || [];
    const overlay = chunk.length > 0
      ? `
        <div class="patch warm" style="left:86px; top:126px; width:746px; height:892px;"></div>
        <div class="overlay flatland chunk" style="left:102px; top:142px; width:706px;">
          ${chunk.map(renderFlatlandBlock).join("")}
        </div>
      `
      : "";
    pages.push(renderPage(doc, index, overlay));
  }

  return pages.join("\n");
}

function renderFlatlandBlock(block) {
  if (block.type === "h2") {
    return `<h2>${escapeHtml(block.text)}</h2>`;
  }
  if (block.type === "h3") {
    return `<h3>${escapeHtml(block.text)}</h3>`;
  }
  return `<p>${renderInline(stripMarkdown(block.text))}</p>`;
}

function renderPage(doc, pageNumber, overlay) {
  const bgSrc = backgroundSrc(doc, pageNumber);
  return `
    <section class="page">
      <div class="page-canvas">
        <img class="bg" src="${escapeAttribute(bgSrc)}" alt="">
        ${overlay}
      </div>
    </section>
  `;
}

function cssPageWidth(doc) {
  return roundCss(doc.paperWidthPt * CSS_PX_PER_PT);
}

function cssPageHeight(doc) {
  return roundCss(doc.paperHeightPt * CSS_PX_PER_PT);
}

function roundCss(value) {
  return Math.round(value * 1000) / 1000;
}

function paperWidthIn(doc) {
  return roundCss(doc.paperWidthPt / 72);
}

function paperHeightIn(doc) {
  return roundCss(doc.paperHeightPt / 72);
}

async function loadBackgrounds(doc) {
  const entries = [];

  for (let pageNumber = 1; pageNumber <= doc.pages; pageNumber += 1) {
    const filePath = backgroundPath(doc, pageNumber);
    const buffer = await fs.readFile(filePath);
    entries.push(`data:image/png;base64,${buffer.toString("base64")}`);
  }

  return entries;
}

function backgroundSrc(doc, pageNumber) {
  return doc.backgrounds[pageNumber - 1];
}

function backgroundPath(doc, pageNumber) {
  const fileName = `${doc.id}-${String(pageNumber).padStart(2, "0")}.png`;
  return path.join(tmpDir, doc.id, fileName);
}

function parseMarkdown(markdown) {
  const lines = String(markdown || "").replace(/\r/g, "").split("\n");
  const titleLine = lines.find((line) => /^#\s+/.test(line));
  const title = titleLine ? stripMarkdown(titleLine.replace(/^#\s+/, "")) : "";
  const sections = [];
  const leading = [];
  let current = null;

  for (const line of lines) {
    if (/^#\s+/.test(line) || /^---+$/.test(line.trim())) {
      continue;
    }

    if (/^##\s+/.test(line)) {
      current = { title: stripMarkdown(line.replace(/^##\s+/, "")), subhead: "", blocks: [] };
      sections.push(current);
      continue;
    }

    if (/^###\s+/.test(line)) {
      if (!current) {
        current = { title: stripMarkdown(line.replace(/^###\s+/, "")), subhead: "", blocks: [] };
        sections.push(current);
      } else if (!current.subhead) {
        current.subhead = stripMarkdown(line.replace(/^###\s+/, ""));
      } else {
        current.blocks.push(stripMarkdown(line.replace(/^###\s+/, "")));
      }
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (current) {
      current.blocks.push(trimmed);
    } else {
      leading.push(trimmed);
    }
  }

  return { title, leading, sections };
}

function flattenMarkdown(parsed) {
  const blocks = [];

  for (const line of parsed.leading) {
    blocks.push({ type: "p", text: line });
  }

  for (const section of parsed.sections) {
    blocks.push({ type: "h2", text: section.title });
    if (section.subhead) {
      blocks.push({ type: "h3", text: section.subhead });
    }
    for (const block of section.blocks) {
      blocks.push({ type: "p", text: block });
    }
  }

  return blocks;
}

function chunkBlocks(blocks, targetWords) {
  const chunks = [];
  let current = [];
  let words = 0;

  for (const block of blocks) {
    const blockWords = wordCount(block.text);
    if (current.length > 0 && words + blockWords > targetWords && block.type !== "h2") {
      chunks.push(current);
      current = [];
      words = 0;
    }
    current.push(block);
    words += blockWords;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function wordCount(value) {
  return String(value || "").split(/\s+/).filter(Boolean).length;
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^>\s?/, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function renderInline(text) {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
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

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
