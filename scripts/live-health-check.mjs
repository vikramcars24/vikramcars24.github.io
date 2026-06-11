import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sitePath = (...parts) => path.join(rootDir, ...parts);
const reportPath = process.env.SITE_HEALTH_REPORT_PATH
  ? path.resolve(process.env.SITE_HEALTH_REPORT_PATH)
  : sitePath("tmp", "site-health-report.md");

const redirectChecks = [
  ["/posts/most-execution-problems-are-trust-problems/", "/posts/execution-problems-begin-as-trust-problems/"],
  ["/posts/the-context-we-refuse-to-see/", "/posts/you-judge-others-by-character-and-yourself-by-circumstance/"],
  ["/posts/ai-may-do-for-consumer-what-saas-did-for-software/", "/posts/ai-will-do-for-consumer-what-saas-did-for-software/"],
  ["/posts/the-car-is-the-artifact-trust-is-the-product/", "/posts/why-we-are-not-selling-cars/"]
];

async function main() {
  const site = JSON.parse(await fs.readFile(sitePath("content", "site.json"), "utf8"));
  const domain = site.domain.replace(/\/$/, "");
  const postSlugs = (await fs.readdir(sitePath("content", "posts")))
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""))
    .sort();

  const pages = [
    ["/", "home"],
    ["/archive/", "archive"],
    ["/subscribe/", "subscribe"],
    ["/rss.xml", "rss"],
    ["/sitemap.xml", "sitemap"],
    ["/robots.txt", "robots"],
    ...postSlugs.map((slug) => [`/posts/${slug}/`, slug])
  ];

  const checks = [];
  const failures = [];

  for (const [pathname, label] of pages) {
    const result = await checkPage(`${domain}${pathname}`, label);
    checks.push(result);
    if (!result.ok) failures.push(`${label}: ${result.message}`);
  }

  for (const [from, to] of redirectChecks) {
    const result = await checkRedirect(`${domain}${from}`, `${domain}${to}`);
    checks.push(result);
    if (!result.ok) failures.push(`${from} -> ${to}: ${result.message}`);
  }

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, renderReport({ domain, checks, failures }), "utf8");

  if (failures.length > 0) {
    console.error(`Live health check failed. Report written to ${reportPath}`);
    for (const failure of failures) {
      console.error(`ERROR: ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Live health check passed for ${checks.length} checks.`);
  console.log(`Report written to ${reportPath}`);
}

async function checkPage(url, label) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "vikramchopra-site-ops/1.0"
      }
    });
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("text/html") ? await response.text() : "";

    if (!response.ok) {
      return {
        kind: "page",
        label,
        url,
        ok: false,
        status: response.status,
        message: `expected 200, got ${response.status}`
      };
    }

    if (contentType.includes("text/html")) {
      if (!/<title>.*?<\/title>/i.test(body)) {
        return {
          kind: "page",
          label,
          url,
          ok: false,
          status: response.status,
          message: "missing <title> in HTML response"
        };
      }
    }

    return {
      kind: "page",
      label,
      url,
      ok: true,
      status: response.status,
      message: `${response.status} ${contentType || "ok"}`
    };
  } catch (error) {
    return {
      kind: "page",
      label,
      url,
      ok: false,
      status: 0,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkRedirect(fromUrl, toUrl) {
  try {
    const response = await fetch(fromUrl, {
      redirect: "manual",
      headers: {
        "user-agent": "vikramchopra-site-ops/1.0"
      }
    });
    const location = response.headers.get("location") || "";
    const status = response.status;
    const htmlRedirect = await checkHtmlRedirect(fromUrl, toUrl);
    const ok = ((status === 301 || status === 308) && location === toUrl) || htmlRedirect.ok;

    return {
      kind: "redirect",
      label: fromUrl,
      url: fromUrl,
      ok,
      status,
      message: ok
        ? ((status === 301 || status === 308) ? `${status} -> ${location}` : `html redirect -> ${toUrl}`)
        : `expected 301/308 or HTML redirect -> ${toUrl}, got ${status} -> ${location || "no location header"}`
    };
  } catch (error) {
    return {
      kind: "redirect",
      label: fromUrl,
      url: fromUrl,
      ok: false,
      status: 0,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkHtmlRedirect(fromUrl, toUrl) {
  try {
    const response = await fetch(fromUrl, {
      redirect: "follow",
      headers: {
        "user-agent": "vikramchopra-site-ops/1.0"
      }
    });
    const body = await response.text();
    const hasRefresh = body.includes(`url=${toUrl}`) || body.includes(`URL=${toUrl}`);
    const hasCanonical = body.includes(`href="${toUrl}"`);
    const hasJsRedirect = body.includes(`window.location.replace(${JSON.stringify(toUrl)})`)
      || body.includes(`window.location.href = ${JSON.stringify(toUrl)}`);

    return { ok: response.ok && (hasRefresh || hasCanonical || hasJsRedirect) };
  } catch {
    return { ok: false };
  }
}

function renderReport({ domain, checks, failures }) {
  const generatedAt = new Date().toISOString();
  const lines = [
    "# Site Ops Health Report",
    "",
    `- Site: ${domain}`,
    `- Generated: ${generatedAt}`,
    `- Checks: ${checks.length}`,
    `- Failures: ${failures.length}`,
    ""
  ];

  if (failures.length > 0) {
    lines.push("## Failures", "");
    for (const failure of failures) {
      lines.push(`- ${failure}`);
    }
    lines.push("");
  }

  lines.push("## Results", "");
  for (const check of checks) {
    const icon = check.ok ? "OK" : "FAIL";
    lines.push(`- [${icon}] ${check.kind} ${check.label}: ${check.message}`);
  }

  lines.push("");
  return lines.join("\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
