import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "content", "culture-docs");
const outputDir = path.join(sourceDir, "translations");

const LANGUAGES = {
  hi: { name: "Hindi", nativeName: "हिन्दी", context: "natural modern Hindi that a Cars24 teammate in India would actually read" },
  mr: { name: "Marathi", nativeName: "मराठी", context: "natural workplace Marathi, not Sanskritised or literal" },
  gu: { name: "Gujarati", nativeName: "ગુજરાતી", context: "clear contemporary Gujarati for a builder audience" },
  bn: { name: "Bengali", nativeName: "বাংলা", context: "natural Bengali with a direct founder note tone" },
  ta: { name: "Tamil", nativeName: "தமிழ்", context: "natural contemporary Tamil used by professionals" },
  te: { name: "Telugu", nativeName: "తెలుగు", context: "natural contemporary Telugu used by professionals" },
  kn: { name: "Kannada", nativeName: "ಕನ್ನಡ", context: "natural workplace Kannada, clear and direct" },
  ml: { name: "Malayalam", nativeName: "മലയാളം", context: "natural contemporary Malayalam used by professionals" },
  pa: { name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", context: "natural Punjabi with a direct builder tone" },
  or: { name: "Odia", nativeName: "ଓଡ଼ିଆ", context: "natural contemporary Odia used by professionals" }
};

const DOCS = {
  flatland: {
    sourceFile: "flatland.en.txt",
    outputFile: "flatland.md",
    title: "Flatland"
  },
  values: {
    sourceFile: "cars24-values.en.txt",
    outputFile: "cars24-values.md",
    title: "Our Values"
  }
};

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const requestedLanguages = [...args].filter((arg) => LANGUAGES[arg]);
const requestedDocs = [...args].filter((arg) => DOCS[arg]);
const languages = requestedLanguages.length > 0 ? requestedLanguages : Object.keys(LANGUAGES);
const docs = requestedDocs.length > 0 ? requestedDocs : Object.keys(DOCS);

for (const docId of docs) {
  const doc = DOCS[docId];
  const source = await fs.readFile(path.join(sourceDir, doc.sourceFile), "utf8");

  for (const languageCode of languages) {
    const language = LANGUAGES[languageCode];
    const languageDir = path.join(outputDir, languageCode);
    const outputPath = path.join(languageDir, doc.outputFile);

    if (!force && await exists(outputPath)) {
      console.log(`skip ${languageCode}/${doc.outputFile}`);
      continue;
    }

    await fs.mkdir(languageDir, { recursive: true });
    console.log(`translate ${doc.title} -> ${language.name}`);
    const markdown = translateWithClaude({ doc, source, language });
    await fs.writeFile(outputPath, `${cleanMarkdown(markdown)}\n`, "utf8");
  }
}

function translateWithClaude({ doc, source, language }) {
  const chunks = chunkSource(source);
  const translatedChunks = [];

  for (const [index, chunk] of chunks.entries()) {
    console.log(`  chunk ${index + 1}/${chunks.length}`);
    translatedChunks.push(translateChunkWithClaude({
      doc,
      source: chunk,
      language,
      chunkNumber: index + 1,
      chunkCount: chunks.length
    }));
  }

  return translatedChunks.join("\n\n");
}

function translateChunkWithClaude({ doc, source, language, chunkNumber, chunkCount }) {
  const prompt = `
You are translating a Cars24 founder culture document for internal teammates.

Translate "${doc.title}" into ${language.name} (${language.nativeName}).
This is section ${chunkNumber} of ${chunkCount}. Translate only this source section.

Translation standard:
- Do not translate literally. Carry the message, emotion, urgency, and founder voice into ${language.context}.
- Keep Cars24, AI, Flatland, and product/company names unchanged.
- Keep "Builder" in English when it is being used as a culture-role term. You may explain it naturally in the sentence around it.
- Preserve section structure with Markdown headings.
- Remove PDF furniture such as page numbers, headers, footers, "scroll to begin", and form-feed artifacts.
- Use concise, confident language. Avoid bureaucratic, textbook, or over-formal phrasing.
- Do not add commentary, notes, prefaces, code fences, or translation disclaimers.
- Output Markdown only.

SOURCE:
${source}
`.trim();

  const args = [
    "-p",
    "--model",
    "sonnet",
    "--effort",
    "low",
    "--no-session-persistence",
    "--tools",
    "",
    "--max-budget-usd",
    "0.60",
    prompt
  ];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return execFileSync("claude", args, {
        cwd: rootDir,
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 8,
        timeout: 180_000
      });
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
      console.warn(`  retrying chunk after Claude error: ${error.message}`);
    }
  }

  throw new Error("Claude translation failed unexpectedly.");
}

function chunkSource(source) {
  const pages = String(source)
    .split(/\f+/)
    .map((page) => page.trim())
    .filter(Boolean);
  const chunks = [];
  let current = [];
  let currentWords = 0;

  for (const page of pages) {
    const pageWords = page.split(/\s+/).filter(Boolean).length;
    if (current.length > 0 && currentWords + pageWords > 350) {
      chunks.push(current.join("\n\n"));
      current = [];
      currentWords = 0;
    }
    current.push(page);
    currentWords += pageWords;
  }

  if (current.length > 0) {
    chunks.push(current.join("\n\n"));
  }

  return chunks;
}

function cleanMarkdown(value) {
  return String(value)
    .replace(/^```(?:markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/\r/g, "")
    .trim();
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
