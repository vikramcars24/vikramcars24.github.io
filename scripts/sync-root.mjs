import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");

const managedEntries = [
  "index.html",
  "404.html",
  "styles.css",
  "favicon.svg",
  "rss.xml",
  "sitemap.xml",
  "robots.txt",
  "llms.txt",
  "_redirects",
  "_headers",
  "archive",
  "culture",
  "hi",
  "hinglish",
  "mr",
  "gu",
  "bn",
  "ta",
  "te",
  "kn",
  "ml",
  "pa",
  "or",
  "posts",
  "subscribe",
  "media",
  ".nojekyll",
  "CNAME"
];

async function main() {
  for (const entry of managedEntries) {
    await fs.rm(path.join(rootDir, entry), { recursive: true, force: true });
  }

  for (const entry of managedEntries.filter((value) => value !== ".nojekyll" && value !== "CNAME")) {
    const source = path.join(distDir, entry);
    if (!(await exists(source))) {
      continue;
    }
    await fs.cp(source, path.join(rootDir, entry), { recursive: true, force: true });
  }

  await fs.writeFile(path.join(rootDir, ".nojekyll"), "", "utf8");

  console.log("Synced dist/ output into repository root for the independent GitHub Pages fallback.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
