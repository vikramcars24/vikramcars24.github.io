import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "content", "culture-docs");
const outputDir = path.join(sourceDir, "translations");

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

  return claude(prompt, {
    systemPrompt: "You are a translation engine. Return only the requested translated Markdown and no commentary.",
    maxBufferMb: 16,
    timeoutMs: 600_000
  });
}

function claude(prompt, { systemPrompt, maxBufferMb, timeoutMs }) {
  const args = [
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
      const result = spawnSync("claude", args, {
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
        return claudeViaAgentOpsShim({ prompt, systemPrompt, timeoutMs, maxBufferMb, cliError: error });
      }
      console.warn(`  retrying chunk after Claude error: ${formatClaudeError(error)}`);
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
    max_tokens=16000,
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
