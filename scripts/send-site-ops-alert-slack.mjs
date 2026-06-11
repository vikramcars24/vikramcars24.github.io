import { promises as fs } from "node:fs";
import path from "node:path";
import { getSlackToken, openDirectMessage, postMessage } from "./lib/slack-client.mjs";

const rootDir = process.cwd();
const defaultUserId = "U054KL2NR";
const reportFiles = [
  path.join(rootDir, "tmp", "site-health-report.md"),
  path.join(rootDir, "tmp", "lighthouse-report.md")
];

async function main() {
  const token = getSlackToken();
  const userId = process.env.SLACK_REPORT_DM_USER || defaultUserId;
  const report = await buildReport();
  const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : "";
  const message = renderMessage(report, runUrl);

  try {
    const dm = await openDirectMessage(token, userId);
    await postMessage(token, dm.id, message);
    console.log(`Site ops alert sent to Slack DM ${userId}`);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    if (messageText.includes("missing_scope")) {
      console.log(`Site ops alert not sent to Slack DM ${userId}: ${messageText}`);
      console.log("Skipping delivery until Slack token gains DM send scope.");
      return;
    }

    throw error;
  }
}

async function buildReport() {
  const sections = [];

  for (const file of reportFiles) {
    try {
      const contents = await fs.readFile(file, "utf8");
      if (contents.trim()) {
        sections.push(contents.trim());
      }
    } catch {
      // Ignore missing report files.
    }
  }

  return sections;
}

function renderMessage(sections, runUrl) {
  const lines = [
    "*Site Ops alert*",
    "vikramchopra.in has a failing monitoring run."
  ];

  if (runUrl) {
    lines.push(`<${runUrl}|Open GitHub Actions run>`);
  }

  if (sections.length === 0) {
    lines.push("");
    lines.push("The workflow failed before it wrote a detailed report.");
    return lines.join("\n");
  }

  lines.push("");
  lines.push("*Failure summary*");

  for (const line of summarize(sections.join("\n\n"))) {
    lines.push(`- ${line}`);
  }

  return lines.join("\n");
}

function summarize(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const failures = lines
    .filter((line) => /^- /.test(line) && (line.includes("[FAIL]") || /failures?:/i.test(line) || /^- ERROR:/i.test(line)))
    .map((line) => line.replace(/^- /, "").replace(/^\[FAIL\]\s*/i, ""));

  if (failures.length > 0) {
    return failures.slice(0, 8);
  }

  return lines.slice(0, 8);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
