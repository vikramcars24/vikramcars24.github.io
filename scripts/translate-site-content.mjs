import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "content");
const postsDir = path.join(contentDir, "posts");
const outputDir = path.join(contentDir, "site-translations");

const LANGUAGES = {
  hi: { name: "Hindi", nativeName: "हिन्दी", context: "natural modern Hindi that a Cars24 teammate in India would actually read" },
  hinglish: { name: "Hinglish", nativeName: "Hinglish", context: "natural Hindi-English mix written in Roman script, like a clear Cars24 teammate note, not awkward transliteration" },
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

const COLLECTIONS = [
  {
    id: "mobility-ownership-trust",
    title: "Mobility, Ownership, and Trust",
    description: "How messy assets become trustworthy enough to buy, finance, keep, and use."
  },
  {
    id: "ai-work-company-design",
    title: "Organization, AI, and Company Design",
    description: "How companies learn, stay steady under pressure, and redesign themselves as context gets cheaper and builders close loops faster."
  },
  {
    id: "judgment-desire-human-nature",
    title: "Judgment, Desire, and Human Nature",
    description: "How we misread our own desires, misjudge other people, and carry invisible psychological machinery into everyday life."
  },
  {
    id: "more-essays",
    title: "More Essays",
    description: "Additional writing that does not yet sit inside one of the main thematic tracks."
  }
];

const UI = {
  languageLabel: "Language",
  navEssays: "Essays",
  navDocs: "Docs",
  themeDark: "Dark",
  themeLight: "Light",
  themeToggleLabel: "Switch color theme",
  homeTitle: "I write to think. I publish to be argued with.",
  startHere: "Start here:",
  cars24Culture: "Cars24 Culture",
  cultureTitle: "Flatland and values",
  cultureDescription: "Use the language selector in the top masthead. The PDF links below follow the selected language.",
  documentsTitle: "Documents",
  openPdf: "Open PDF",
  writing: "Writing",
  essaySingular: "essay",
  essayPlural: "essays",
  archiveEyebrow: "Essays",
  archiveTitle: "Published writing",
  archiveDescription: "Essays by Vikram Chopra on car ownership, trust, AI-native companies, and leadership under pressure.",
  home: "Home",
  share: "Share",
  copied: "Copied",
  minRead: "min read",
  words: "words",
  inBrief: "In Brief",
  onThisPage: "On this page",
  notesAndSources: "Notes and Sources",
  continueReading: "Continue Reading",
  moreIn: "More in",
  subscribeFallbackKicker: "By Email",
  subscribeWhatToExpect: "What to expect",
  subscribePoints: [
    "New essays only.",
    "A few times a year, not every week.",
    "One confirmation email finishes the subscription."
  ],
  watchOnYouTube: "Watch on YouTube",
  elsewhere: "Elsewhere",
  notFoundEyebrow: "404",
  notFoundTitle: "That page drifted off.",
  notFoundIntro: "The writing is still intact. Start again from the homepage or the essays.",
  goHome: "Go home",
  openEssays: "Open essays",
  footerEssays: "Essays",
  footerSubscribe: "Subscribe",
  essaySignoff: "Vikram Chopra, Founder & Builder",
  cultureDocs: {
    flatland: {
      title: "Flatland",
      meta: "Culture book - 33 pages",
      description: "An operating note for a flatter, faster Cars24: builder ownership, open information, AI-native work, and clarity over hierarchy."
    },
    values: {
      title: "Our Values",
      meta: "Culture book - 22 pages",
      description: "Five values for how Cars24 works: customer love, ownership, truth, high standards, and becoming better humans through work."
    }
  },
  collections: Object.fromEntries(COLLECTIONS.map((collection) => [
    collection.id,
    { title: collection.title, description: collection.description }
  ]))
};

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const siteOnly = args.has("--site-only");
const postsOnly = args.has("--posts-only");
const requestedLanguages = [...args].filter((arg) => LANGUAGES[arg]);
const requestedPostSlugs = [...args]
  .filter((arg) => !arg.startsWith("--") && !LANGUAGES[arg])
  .map((arg) => arg.replace(/\.md$/, ""));
const languages = requestedLanguages.length > 0 ? requestedLanguages : Object.keys(LANGUAGES);
const forceChunkedPosts = process.env.FORCE_CHUNKED_POSTS === "1";
const batchMode = !forceChunkedPosts && !siteOnly && !postsOnly && requestedPostSlugs.length === 0;
const batchPostLimit = Math.max(1, Number.parseInt(process.env.TRANSLATION_BATCH_POSTS || "2", 10) || 2);
const chunkWordLimit = Math.max(250, Number.parseInt(process.env.TRANSLATION_CHUNK_WORDS || "650", 10) || 650);

const baseSite = JSON.parse(await fs.readFile(path.join(contentDir, "site.json"), "utf8"));
const postFiles = (await fs.readdir(postsDir))
  .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
  .filter((file) => requestedPostSlugs.length === 0 || requestedPostSlugs.includes(file.replace(/\.md$/, "")))
  .sort();

for (const languageCode of languages) {
  const language = LANGUAGES[languageCode];
  const languageDir = path.join(outputDir, languageCode);
  const sitePath = path.join(languageDir, "site.json");

  await fs.mkdir(path.join(languageDir, "posts"), { recursive: true });

  let shouldTranslateSite = !postsOnly && (force || !(await exists(sitePath)));
  let postPlans = [];

  if (!siteOnly) {
    postPlans = await collectPostPlans({ languageCode, languageDir, logSkips: true });
  }

  if (batchMode && (postPlans.length > 1 || (shouldTranslateSite && postPlans.length > 0))) {
    try {
      await translateLanguageBatch({
        language,
        languageCode,
        shouldTranslateSite,
        sitePath,
        postPlans
      });
      continue;
    } catch (error) {
      console.warn(`  batch translation failed for ${language.name}; falling back to file-by-file mode: ${error.message}`);
      shouldTranslateSite = !postsOnly && (force || !(await exists(sitePath)));
      postPlans = siteOnly ? [] : await collectPostPlans({ languageCode, languageDir, logSkips: false });
      if (!shouldTranslateSite && postPlans.length === 0) {
        continue;
      }
    }
  }

  if (shouldTranslateSite) {
    console.log(`translate site chrome -> ${language.name}`);
    const translatedSite = normalizeTranslatedSite(translateSiteWithClaude({ language, site: buildSiteTranslationSource(baseSite) }));
    await fs.writeFile(sitePath, `${stableJson(translatedSite)}\n`, "utf8");
  } else if (!postsOnly) {
    console.log(`skip ${languageCode}/site.json`);
  }

  if (siteOnly) {
    continue;
  }

  for (const plan of postPlans) {
    const source = await fs.readFile(path.join(postsDir, plan.file), "utf8");
    console.log(`translate ${plan.file} -> ${language.name}`);
    const translated = translatePostResilientWithClaude({ language, source, file: plan.file });
    await fs.writeFile(plan.outputPath, `${cleanMarkdown(translated)}\n`, "utf8");
  }
}

async function collectPostPlans({ languageCode, languageDir, logSkips }) {
  const plans = [];
  for (const file of postFiles) {
    const outputPath = path.join(languageDir, "posts", file);
    if (!force && await exists(outputPath)) {
      if (logSkips) {
        console.log(`skip ${languageCode}/posts/${file}`);
      }
      continue;
    }
    plans.push({ file, outputPath });
  }
  return plans;
}

async function translateLanguageBatch({ language, languageCode, shouldTranslateSite, sitePath, postPlans }) {
  const chunks = chunkArray(postPlans, batchPostLimit);

  for (const [index, chunk] of chunks.entries()) {
    const includeSite = shouldTranslateSite && index === 0;
    const postSources = {};
    for (const plan of chunk) {
      postSources[plan.file] = await fs.readFile(path.join(postsDir, plan.file), "utf8");
    }

    const pieces = [
      includeSite ? "site chrome" : null,
      chunk.length > 0 ? `${chunk.length} post(s)` : null
    ].filter(Boolean).join(" + ");
    console.log(`translate ${pieces} -> ${language.name} (${index + 1}/${chunks.length})`);

    const translatedBatch = translateBatchWithClaude({
      language,
      site: includeSite ? buildSiteTranslationSource(baseSite) : null,
      posts: postSources
    });

    const writes = [];

    if (includeSite) {
      if (!translatedBatch.site || typeof translatedBatch.site !== "object") {
        throw new Error("batch output did not include a site object");
      }
      writes.push({
        outputPath: sitePath,
        content: `${stableJson(normalizeTranslatedSite(translatedBatch.site))}\n`
      });
    }

    if (!translatedBatch.posts || typeof translatedBatch.posts !== "object" || Array.isArray(translatedBatch.posts)) {
      throw new Error("batch output did not include a posts object");
    }

    for (const plan of chunk) {
      const translated = translatedBatch.posts[plan.file];
      if (typeof translated !== "string" || translated.trim().length < 200) {
        throw new Error(`batch output missing or too short for ${languageCode}/posts/${plan.file}`);
      }
      writes.push({
        outputPath: plan.outputPath,
        content: `${cleanMarkdown(translated)}\n`
      });
    }

    for (const write of writes) {
      await fs.writeFile(write.outputPath, write.content, "utf8");
    }
  }
}

function chunkArray(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function buildSiteTranslationSource(site) {
  return {
    site: pick(site, [
      "siteTitle",
      "tagline",
      "description",
      "socialTitle",
      "socialDescription",
      "socialImageAlt",
      "intro",
      "about",
      "footerNote",
      "subscribe",
      "interviews",
      "elsewhere"
    ]),
    ui: UI
  };
}

function translateSiteWithClaude({ language, site }) {
  const prompt = `
You are translating Vikram Chopra's personal website UI and homepage metadata for Indian teammates.

Translate the JSON values into ${language.name} (${language.nativeName}).

Translation standard:
- Do not translate literally. Carry the message, feel, founder voice, and clarity into ${language.context}.
- Keep Vikram Chopra, Cars24, AI, Flatland, Builder, URLs, video IDs, Buttondown, LinkedIn, X, RSS, and file paths unchanged.
- Preserve the exact JSON object shape and keys.
- Translate only human-facing text values. Do not translate action URLs, hrefs, videoId, dates, image paths, domain, or source names like Moneycontrol/Cars24 unless they are generic labels.
- Keep output valid JSON only. No markdown, code fence, comments, notes, or preface.

SOURCE JSON:
${JSON.stringify(site, null, 2)}
`.trim();

  return parseJson(claude(prompt));
}

function translatePostWithClaude({ language, source, file }) {
  const prompt = `
You are translating an essay from Vikram Chopra's personal website.

Translate ${file} into ${language.name} (${language.nativeName}).

Translation standard:
- Do not translate literally. Carry the message, emotion, cadence, argument, and founder voice into ${language.context}.
- Preserve Markdown structure, headings, paragraphs, bullet lists, blockquotes, and frontmatter delimiters.
- Preserve slug, date, image paths, URLs, and source links exactly.
- Keep Vikram Chopra, Cars24, AI, SaaS, EV, FASTag, RC, PUC, Builder, company names, publication names, and named people unchanged unless a natural local rendering is clearly standard.
- Translate title, displayTitle, metaTitle, description, socialDescription, imageAlt, articleImageAlt, summary, category, body text, Notes and Sources prose, and link labels when human-facing.
- Keep the summary delimiter " | " if present.
- Do not add commentary, notes, prefaces, code fences, or translation disclaimers.
- Output only the translated Markdown file.

SOURCE MARKDOWN:
${source}
`.trim();

  return claude(prompt);
}

function translatePostResilientWithClaude({ language, source, file }) {
  if (forceChunkedPosts) {
    return translatePostInChunksWithClaude({ language, source, file });
  }

  try {
    return translatePostWithClaude({ language, source, file });
  } catch (error) {
    console.warn(`  full-post translation failed for ${file}; splitting into sections: ${formatClaudeError(error)}`);
    return translatePostInChunksWithClaude({ language, source, file });
  }
}

function translatePostInChunksWithClaude({ language, source, file }) {
  const chunks = chunkMarkdownSource(source, chunkWordLimit);
  return chunks.map((chunk, index) => {
    console.log(`  section ${index + 1}/${chunks.length}`);
    return cleanMarkdown(translatePostChunkWithClaude({
      language,
      source: chunk,
      file,
      chunkNumber: index + 1,
      chunkCount: chunks.length
    }));
  }).join("\n\n");
}

function translatePostChunkWithClaude({ language, source, file, chunkNumber, chunkCount }) {
  const prompt = `
You are translating one section of an essay from Vikram Chopra's personal website.

Translate ${file} into ${language.name} (${language.nativeName}).
This is section ${chunkNumber} of ${chunkCount}. Translate only this source section.

Translation standard:
- Do not translate literally. Carry the message, emotion, cadence, argument, and founder voice into ${language.context}.
- Preserve Markdown structure, headings, paragraphs, bullet lists, blockquotes, and frontmatter delimiters if present in this section.
- Preserve slug, date, image paths, URLs, and source links exactly.
- Keep Vikram Chopra, Cars24, AI, SaaS, EV, FASTag, RC, PUC, Builder, company names, publication names, and named people unchanged unless a natural local rendering is clearly standard.
- Translate title, displayTitle, metaTitle, description, socialDescription, imageAlt, articleImageAlt, summary, category, body text, Notes and Sources prose, and link labels when human-facing.
- Keep the summary delimiter " | " if present.
- Do not add commentary, notes, prefaces, code fences, or translation disclaimers.
- Output only the translated Markdown section.

SOURCE MARKDOWN SECTION:
${source}
`.trim();

  return claude(prompt, { timeoutMs: 600_000 });
}

function translateBatchWithClaude({ language, site, posts }) {
  const expectedPostFiles = Object.keys(posts);
  const prompt = `
You are translating Vikram Chopra's personal website for Indian teammates.

Translate the supplied website payload into ${language.name} (${language.nativeName}).

Translation standard:
- Do not translate literally. Carry the message, emotion, cadence, argument, founder voice, and clarity into ${language.context}.
- Return only the marker-delimited translated artifacts described below.
- If SOURCE PAYLOAD JSON has a non-null "site", include one site block with translated JSON that preserves the exact object shape and keys.
- For each requested post filename, include one post block with that exact filename and the complete translated Markdown file.
- Preserve Markdown structure, headings, paragraphs, bullet lists, blockquotes, and frontmatter delimiters.
- Preserve slug, date, image paths, URLs, video IDs, file paths, and source links exactly.
- Keep Vikram Chopra, Cars24, AI, SaaS, EV, FASTag, RC, PUC, Flatland, Builder, company names, publication names, and named people unchanged unless a natural local rendering is clearly standard.
- Translate all human-facing text: homepage/UI labels, titles, metadata, descriptions, summaries, categories, body text, Notes and Sources prose, and link labels.
- Keep the summary delimiter " | " if present.
- Do not add commentary, notes, prefaces, code fences, or translation disclaimers.

Output format:
${site ? "<<<SITE_JSON>>>\n{translated site JSON}\n<<<END_SITE_JSON>>>\n" : ""}${expectedPostFiles.map((file) => `<<<POST:${file}>>>\n{complete translated Markdown for ${file}}\n<<<END_POST>>>`).join("\n")}

SOURCE PAYLOAD JSON:
${JSON.stringify({ site, posts }, null, 2)}
`.trim();

  return parseBatchOutput(claude(prompt, { maxBufferMb: 64, timeoutMs: 600_000 }), {
    expectSite: Boolean(site),
    expectedPostFiles
  });
}

function chunkMarkdownSource(source, maxWords) {
  const text = String(source || "").replace(/\r/g, "");
  const frontmatterMatch = text.match(/^---\n[\s\S]*?\n---\n?/);
  const chunks = [];
  let current = [];
  let currentWords = 0;
  let body = text;

  if (frontmatterMatch) {
    current.push(frontmatterMatch[0].trim());
    currentWords += countWords(frontmatterMatch[0]);
    body = text.slice(frontmatterMatch[0].length);
  }

  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const blockWords = countWords(block);
    if (current.length > 0 && currentWords + blockWords > maxWords) {
      chunks.push(current.join("\n\n"));
      current = [];
      currentWords = 0;
    }
    current.push(block);
    currentWords += blockWords;
  }

  if (current.length > 0) {
    chunks.push(current.join("\n\n"));
  }

  return chunks.length > 0 ? chunks : [text];
}

function countWords(value) {
  return String(value || "").split(/\s+/).filter(Boolean).length;
}

function claude(prompt, options = {}) {
  const maxBufferMb = options.maxBufferMb || 16;
  const timeoutMs = options.timeoutMs || 600_000;
  const systemPrompt = "You are a translation engine. Return only the requested translated artifact and no commentary.";
  const commandArgs = [
    "-p",
    "--model",
    "sonnet",
    "--output-format",
    "json",
    "--disable-slash-commands",
    "--effort",
    "low",
    "--no-session-persistence",
    "--tools",
    "",
    "--system-prompt",
    systemPrompt
  ];
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const result = spawnSync("claude", commandArgs, {
        cwd: rootDir,
        env,
        input: prompt,
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * maxBufferMb,
        timeout: timeoutMs
      });
      if (result.error) {
        result.error.stdout = result.stdout;
        result.error.stderr = result.stderr;
        throw result.error;
      }
      if (result.status !== 0) {
        const error = new Error(`claude exited with status ${result.status}`);
        error.status = result.status;
        error.stdout = result.stdout;
        error.stderr = result.stderr;
        throw error;
      }
      const stdout = result.stdout;
      const data = JSON.parse(stdout);
      if (data?.is_error) {
        throw new Error(`Claude CLI reported error: ${String(data.result || data.subtype || "unknown").slice(0, 600)}`);
      }
      return String(data?.result || "");
    } catch (error) {
      const timeout = error.code === "ETIMEDOUT";
      const maxAttempts = timeout ? 2 : 4;
      if (attempt >= maxAttempts || !isRetryableClaudeError(error)) {
        return claudeViaAgentOpsShim({
          prompt,
          systemPrompt,
          timeoutMs,
          maxBufferMb,
          cliError: error
        });
      }
      console.warn(`  retrying after Claude error: ${formatClaudeError(error)}`);
      sleepSync([1_000, 3_000, 8_000][attempt - 1] || 8_000);
    }
  }

  throw new Error("Claude translation failed unexpectedly.");
}

function claudeViaAgentOpsShim({ prompt, systemPrompt, timeoutMs, maxBufferMb, cliError }) {
  console.warn(`  using Agent-Ops Claude shim after CLI error: ${formatClaudeError(cliError)}`);
  const python = `
import json
import os
import sys

sys.path.insert(0, os.path.expanduser("~/Agent-Ops/services/python-shared"))
from claude_cli import Anthropic

payload = json.load(sys.stdin)
client = Anthropic()
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=32000,
    system=payload["system"],
    messages=[{"role": "user", "content": payload["prompt"]}],
    timeout=max(60, int(payload["timeout_ms"] / 1000)),
)
print(json.dumps({"result": response.content[0].text}, ensure_ascii=False))
`.trim();
  const result = spawnSync("python3", ["-c", python], {
    cwd: rootDir,
    env: process.env,
    input: JSON.stringify({ prompt, system: systemPrompt, timeout_ms: timeoutMs }),
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * maxBufferMb,
    timeout: timeoutMs + 120_000
  });

  if (result.error) {
    throw new Error(`${formatClaudeError(cliError)}; Agent-Ops shim failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${formatClaudeError(cliError)}; Agent-Ops shim failed with status ${result.status}: ${String(result.stderr || result.stdout || "").slice(0, 600)}`);
  }

  try {
    return String(JSON.parse(result.stdout).result || "");
  } catch (error) {
    throw new Error(`${formatClaudeError(cliError)}; Agent-Ops shim returned invalid JSON: ${String(result.stdout || error.message).slice(0, 600)}`);
  }
}

function formatClaudeError(error) {
  const details = [
    error.code ? `code=${error.code}` : null,
    error.signal ? `signal=${error.signal}` : null,
    Number.isInteger(error.status) ? `status=${error.status}` : null
  ].filter(Boolean);
  const stdout = String(error.stdout || "").trim();
  if (stdout) {
    try {
      const data = JSON.parse(stdout);
      if (data?.is_error) {
        details.push(`api_status=${data.api_error_status || "unknown"}`);
        details.push(`result=${String(data.result || data.subtype || "unknown").slice(0, 240)}`);
      } else {
        details.push(`stdout=${stdout.slice(0, 240)}`);
      }
    } catch {
      details.push(`stdout=${stdout.slice(0, 240)}`);
    }
  }
  const stderr = String(error.stderr || "").trim();
  if (stderr) {
    details.push(stderr.slice(0, 240));
  }
  return details.length > 0 ? details.join(" ") : String(error.message || "unknown").slice(0, 240);
}

function isRetryableClaudeError(error) {
  if (String(error.stderr || "").trim()) {
    return false;
  }
  const stdout = String(error.stdout || "").trim();
  if (stdout) {
    try {
      const data = JSON.parse(stdout);
      if (data?.is_error) {
        const result = String(data.result || "").toLowerCase();
        if (result.includes("invalid authentication") || result.includes("not logged in") || result.includes("/login")) {
          return false;
        }
      }
    } catch {
      return true;
    }
  }
  return error.code === "ETIMEDOUT" || Number.isInteger(error.status);
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function cleanMarkdown(value) {
  return String(value)
    .replace(/^```(?:markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/\r/g, "")
    .trim();
}

function parseJson(value) {
  const cleaned = String(value)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return JSON.parse(extractFirstJsonObject(cleaned));
  }
}

function parseBatchOutput(value, { expectSite, expectedPostFiles }) {
  const text = String(value || "")
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const posts = {};
  let site = null;

  if (expectSite) {
    const siteMatch = text.match(/<<<SITE_JSON>>>\s*([\s\S]*?)\s*<<<END_SITE_JSON>>>/);
    if (!siteMatch) {
      throw new Error("batch output did not contain SITE_JSON markers");
    }
    site = parseJson(siteMatch[1]);
  }

  const postPattern = /<<<POST:([^>\n]+)>>>\s*([\s\S]*?)\s*<<<END_POST>>>/g;
  for (const match of text.matchAll(postPattern)) {
    posts[match[1].trim()] = match[2].trim();
  }

  for (const file of expectedPostFiles) {
    if (!posts[file]) {
      throw new Error(`batch output did not contain POST marker for ${file}`);
    }
  }

  return { site, posts };
}

function extractFirstJsonObject(value) {
  const text = String(value || "");
  const start = text.indexOf("{");
  if (start === -1) {
    throw new Error("Claude output did not contain a JSON object.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  throw new Error("Claude output contained an incomplete JSON object.");
}

function stableJson(value) {
  return JSON.stringify(value, null, 2);
}

function normalizeTranslatedSite(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  if (!value.site || typeof value.site !== "object" || Array.isArray(value.site)) {
    return value;
  }

  const normalized = { ...value.site };
  for (const [key, child] of Object.entries(value)) {
    if (key !== "site") {
      normalized[key] = child;
    }
  }
  return normalized;
}

function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, object[key]]).filter(([, value]) => value !== undefined));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
