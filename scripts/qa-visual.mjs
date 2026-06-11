import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const rootDir = process.cwd();
const shotsDir = path.join(rootDir, "qa-screens");
const host = "127.0.0.1";
const port = 4322;

const pages = [
  { slug: "home", route: "/" },
  { slug: "archive", route: "/archive/" },
  { slug: "why-we-are-not-selling-cars", route: "/posts/why-we-are-not-selling-cars/" }
];

const viewports = [
  { slug: "mobile", width: 390, height: 844 },
  { slug: "desktop", width: 1280, height: 900 }
];

const executablePath = process.env.QA_BROWSER || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function ensureShotsDir() {
  await import("node:fs/promises").then(({ mkdir, rm }) =>
    rm(shotsDir, { recursive: true, force: true }).then(() => mkdir(shotsDir, { recursive: true }))
  );
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".xml")) return "application/xml; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function resolvePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  let filePath = path.join(rootDir, cleanPath);

  if (cleanPath.endsWith("/")) {
    filePath = path.join(rootDir, cleanPath, "index.html");
  }

  if (!path.extname(filePath) && existsSync(path.join(filePath, "index.html"))) {
    filePath = path.join(filePath, "index.html");
  }

  return filePath;
}

function createStaticServer() {
  return createServer(async (req, res) => {
    const filePath = resolvePath(req.url || "/");

    try {
      const statPath = existsSync(filePath) ? filePath : path.join(rootDir, "404.html");
      res.writeHead(statPath.endsWith("404.html") ? 404 : 200, {
        "Content-Type": contentType(statPath),
        "Cache-Control": "no-store"
      });
      createReadStream(statPath).pipe(res);
    } catch {
      const body = await readFile(path.join(rootDir, "404.html"), "utf8");
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(body);
    }
  });
}

async function takeShots(browser) {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1
    });

    for (const pageDef of pages) {
      const page = await context.newPage();
      await page.goto(`http://${host}:${port}${pageDef.route}`, { waitUntil: "networkidle" });
      await page.evaluate(async () => {
        const step = Math.max(240, Math.floor(window.innerHeight * 0.75));
        const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        let position = 0;

        while (position < document.body.scrollHeight - window.innerHeight) {
          position = Math.min(position + step, document.body.scrollHeight - window.innerHeight);
          window.scrollTo(0, position);
          await pause(120);
        }

        window.scrollTo(0, 0);
        await pause(180);
      });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(shotsDir, `${pageDef.slug}-${viewport.slug}.png`),
        fullPage: true
      });
      await page.close();
    }

    await context.close();
  }
}

async function main() {
  await ensureShotsDir();
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(port, host, resolve));

  try {
    const browser = await chromium.launch({
      headless: true,
      executablePath: existsSync(executablePath) ? executablePath : undefined
    });

    try {
      await takeShots(browser);
    } finally {
      await browser.close();
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log(`Saved visual QA screenshots to ${shotsDir}`);
}

await main();
