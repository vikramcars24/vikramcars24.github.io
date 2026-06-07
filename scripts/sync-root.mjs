import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const siteConfigPath = path.join(rootDir, "content", "site.json");

const managedEntries = [
  "index.html",
  "404.html",
  "styles.css",
  "favicon.svg",
  "rss.xml",
  "sitemap.xml",
  "robots.txt",
  "archive",
  "posts",
  "media",
  ".nojekyll",
  "CNAME"
];

async function main() {
  for (const entry of managedEntries) {
    await fs.rm(path.join(rootDir, entry), { recursive: true, force: true });
  }

  for (const entry of managedEntries.filter((value) => value !== ".nojekyll" && value !== "CNAME")) {
    await fs.cp(path.join(distDir, entry), path.join(rootDir, entry), { recursive: true, force: true });
  }

  const site = JSON.parse(await fs.readFile(siteConfigPath, "utf8"));
  const hostname = new URL(site.domain).hostname;

  await fs.writeFile(path.join(rootDir, ".nojekyll"), "", "utf8");
  await fs.writeFile(path.join(rootDir, "CNAME"), `${hostname}\n`, "utf8");

  console.log(`Synced dist/ output into repository root for GitHub Pages and wrote CNAME for ${hostname}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
