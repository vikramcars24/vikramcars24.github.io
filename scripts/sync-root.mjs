import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");

const managedEntries = [
  "index.html",
  "404.html",
  "styles.css",
  "rss.xml",
  "sitemap.xml",
  "robots.txt",
  "archive",
  "posts",
  "media",
  ".nojekyll"
];

async function main() {
  for (const entry of managedEntries) {
    await fs.rm(path.join(rootDir, entry), { recursive: true, force: true });
  }

  for (const entry of managedEntries.filter((value) => value !== ".nojekyll")) {
    await fs.cp(path.join(distDir, entry), path.join(rootDir, entry), { recursive: true });
  }

  await fs.writeFile(path.join(rootDir, ".nojekyll"), "", "utf8");

  console.log("Synced dist/ output into repository root for GitHub Pages.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
