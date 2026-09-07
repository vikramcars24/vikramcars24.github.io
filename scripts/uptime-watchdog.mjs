import { appendFile } from "node:fs/promises";
import { getSlackToken, openDirectMessage, postMessage } from "./lib/slack-client.mjs";

const defaultBaseUrl = "https://vikramchopra.in";
const defaultSlackUser = "U054KL2NR";
const issueTitle = "Uptime Alert";
const issueLabel = "uptime";
const slackOpenedMarker = "<!-- uptime-slack-open-sent -->";
const slackRecoveredMarker = "<!-- uptime-slack-recovered-sent -->";
const checks = [
  { path: "/", type: "text/html", body: "<title>Vikram Chopra" },
  { path: "/archive/", type: "text/html" },
  { path: "/subscribe/", type: "text/html" },
  { path: "/sitemap.xml", type: "application/xml" },
  { path: "/rss.xml", type: "application/xml" },
  { path: "/media/docs/flatland.pdf", type: "application/pdf" }
];

export async function checkSite(options = {}) {
  const baseUrl = options.baseUrl || defaultBaseUrl;
  const fetchImpl = options.fetchImpl || fetch;
  const attempts = options.attempts || 2;
  const results = [];

  for (const check of checks) {
    let result;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      result = await probe(check, { baseUrl, fetchImpl, attempt });
      if (result.ok) break;
    }
    results.push(result);
  }

  return {
    checkedAt: new Date().toISOString(),
    baseUrl,
    healthy: results.every((result) => result.ok),
    results
  };
}

async function probe(check, { baseUrl, fetchImpl, attempt }) {
  const url = new URL(check.path, baseUrl);
  url.searchParams.set("uptime_probe", `${Date.now()}-${attempt}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "vikramchopra-uptime-watchdog/1.0" }
    });
    const contentType = response.headers.get("content-type") || "";
    const body = check.body ? await response.text() : "";
    const failures = [];

    if (response.status !== 200) failures.push(`HTTP ${response.status}`);
    if (!contentType.toLowerCase().includes(check.type)) {
      failures.push(`content-type ${contentType || "missing"}`);
    }
    if (check.body && !body.includes(check.body)) failures.push("expected homepage title missing");

    return {
      path: check.path,
      ok: failures.length === 0,
      status: response.status,
      contentType,
      latencyMs: Date.now() - startedAt,
      attempt,
      error: failures.join("; ")
    };
  } catch (error) {
    return {
      path: check.path,
      ok: false,
      status: 0,
      contentType: "",
      latencyMs: Date.now() - startedAt,
      attempt,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const report = await checkSite({ baseUrl: process.env.UPTIME_BASE_URL });
  const markdown = renderMarkdown(report);
  console.log(markdown);
  await writeSummary(markdown);

  if (isTruthy(process.env.UPTIME_DRY_RUN)) return;

  const repository = process.env.GITHUB_REPOSITORY || "";
  const githubToken = process.env.GITHUB_TOKEN || "";
  if (!repository || !githubToken) {
    throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required outside dry-run mode.");
  }

  const issue = await findOpenIssue(repository, githubToken);
  if (!report.healthy && !issue) {
    const created = await createIncident(repository, githubToken, markdown);
    await notifySlackOnce(repository, githubToken, created, slackOpenedMarker, renderSlackOpened(report, created.html_url));
    return;
  }

  if (!report.healthy && issue) {
    await updateIncident(repository, githubToken, issue.number, markdown);
    await notifySlackOnce(repository, githubToken, issue, slackOpenedMarker, renderSlackOpened(report, issue.html_url));
    return;
  }

  if (report.healthy && issue) {
    await notifySlackOnce(repository, githubToken, issue, slackRecoveredMarker, renderSlackRecovered(report, issue.html_url));
    await closeIncident(repository, githubToken, issue.number, report.checkedAt);
  }
}

function renderMarkdown(report) {
  const lines = [
    "# Uptime Watchdog",
    "",
    `- Site: ${report.baseUrl}`,
    `- Checked: ${report.checkedAt}`,
    `- State: ${report.healthy ? "healthy" : "degraded"}`,
    "",
    "## Checks",
    ""
  ];

  for (const result of report.results) {
    const detail = result.ok
      ? `${result.status} ${result.contentType}; ${result.latencyMs} ms`
      : result.error;
    lines.push(`- [${result.ok ? "OK" : "FAIL"}] ${result.path}: ${detail}`);
  }

  const runUrl = githubRunUrl();
  if (runUrl) lines.push("", `Run: ${runUrl}`);
  return `${lines.join("\n")}\n`;
}

async function findOpenIssue(repository, token) {
  const issues = await github(repository, token, `/issues?state=open&labels=${issueLabel}&per_page=20`);
  return issues.find((issue) => issue.title === issueTitle) || null;
}

async function createIncident(repository, token, body) {
  await ensureLabel(repository, token);
  return github(repository, token, "/issues", {
    method: "POST",
    body: JSON.stringify({ title: issueTitle, body, labels: [issueLabel] })
  });
}

async function updateIncident(repository, token, number, body) {
  return github(repository, token, `/issues/${number}`, {
    method: "PATCH",
    body: JSON.stringify({ body })
  });
}

async function closeIncident(repository, token, number, checkedAt) {
  await github(repository, token, `/issues/${number}/comments`, {
    method: "POST",
    body: JSON.stringify({ body: `Recovered at ${checkedAt}.` })
  });
  await github(repository, token, `/issues/${number}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed" })
  });
}

async function notifySlackOnce(repository, token, issue, marker, text) {
  const comments = await github(repository, token, `/issues/${issue.number}/comments?per_page=100`);
  if (comments.some((comment) => comment.body?.includes(marker))) return;

  await sendSlack(text);
  await github(repository, token, `/issues/${issue.number}/comments`, {
    method: "POST",
    body: JSON.stringify({ body: marker })
  });
}

async function ensureLabel(repository, token) {
  const response = await fetch(`https://api.github.com/repos/${repository}/labels`, {
    method: "POST",
    headers: githubHeaders(token),
    body: JSON.stringify({ name: issueLabel, color: "B60205", description: "Public site availability incident" })
  });
  if (!response.ok && response.status !== 422) {
    throw new Error(`GitHub label creation failed: HTTP ${response.status}`);
  }
}

async function github(repository, token, path, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    ...options,
    headers: { ...githubHeaders(token), ...(options.headers || {}) }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`GitHub API ${path} failed: ${payload.message || `HTTP ${response.status}`}`);
  }
  return payload;
}

function githubHeaders(token) {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "x-github-api-version": "2022-11-28"
  };
}

async function sendSlack(text) {
  const token = getSlackToken();
  const channelId = process.env.SLACK_REPORT_DM_CHANNEL || "";
  if (channelId) {
    await postMessage(token, channelId, text);
    return;
  }
  const userId = process.env.SLACK_REPORT_DM_USER || defaultSlackUser;
  const dm = await openDirectMessage(token, userId);
  await postMessage(token, dm.id, text);
}

function renderSlackOpened(report, issueUrl) {
  const failures = report.results.filter((result) => !result.ok);
  return [
    "*vikramchopra.in uptime incident*",
    `Detected: ${report.checkedAt}`,
    ...failures.map((result) => `- ${result.path}: ${result.error}`),
    `<${issueUrl}|Open incident>`
  ].join("\n");
}

function renderSlackRecovered(report, issueUrl) {
  return [
    "*vikramchopra.in recovered*",
    `Confirmed: ${report.checkedAt}`,
    `<${issueUrl}|Incident history>`
  ].join("\n");
}

async function writeSummary(markdown) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
  }
}

function githubRunUrl() {
  if (!process.env.GITHUB_SERVER_URL || !process.env.GITHUB_REPOSITORY || !process.env.GITHUB_RUN_ID) return "";
  return `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
}

function isTruthy(value) {
  return /^(1|true|yes)$/i.test(value || "");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error instanceof Error ? error.stack : String(error));
      process.exit(1);
    });
}
