import { promises as fs } from "node:fs";
import path from "node:path";
import { getSlackToken, openDirectMessage, postMessage } from "./lib/slack-client.mjs";

const rootDir = process.cwd();
const reportPath = path.join(rootDir, "tmp", "audience-dashboard.json");
const defaultUserId = "U054KL2NR";

async function main() {
  const token = getSlackToken();
  const userId = process.env.SLACK_REPORT_DM_USER || defaultUserId;
  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  const message = renderMessage(report);

  try {
    const dm = await openDirectMessage(token, userId);
    await postMessage(token, dm.id, message);
    console.log(`Monthly site report sent to Slack DM ${userId}`);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    if (messageText.includes("missing_scope")) {
      console.log(`Monthly site report not sent to Slack DM ${userId}: ${messageText}`);
      console.log("Skipping delivery until Slack token gains DM send scope.");
      return;
    }

    throw error;
  }
}

function renderMessage(report) {
  const providers = new Map(report.providers.map((provider) => [provider.name, provider]));
  const search = providers.get("Google Search Console");
  const cloudflare = providers.get("Cloudflare");
  const buttondown = providers.get("Buttondown");

  const lines = [
    `*Monthly site report*`,
    `${report.domain}`,
    `Generated: ${formatDateTime(report.generatedAt)}`,
    ""
  ];

  if (cloudflare?.status === "ok") {
    const metrics = cloudflare.metrics?.last7Days || {};
    lines.push("*Traffic*");
    lines.push(`- Page views: ${formatNumber(metrics.pageViews)}`);
    lines.push(`- Uniques: ${formatNumber(metrics.uniques)}`);
    lines.push(`- Requests: ${formatNumber(metrics.requests)}`);
    lines.push(`- Cache ratio: ${formatPercent(metrics.cacheRatio)}`);
    lines.push("");
  }

  if (search?.status === "ok") {
    const metrics = search.metrics || {};
    lines.push("*Search*");
    lines.push(`- Last 28 days clicks: ${formatNumber(metrics.last28Days?.clicks)}`);
    lines.push(`- Last 28 days impressions: ${formatNumber(metrics.last28Days?.impressions)}`);
    lines.push(`- CTR: ${formatPercent(metrics.last28Days?.ctr)}`);
    lines.push(`- Top queries: ${formatRows(metrics.topQueries)}`);
    lines.push(`- Top pages: ${formatRows(metrics.topPages)}`);
    lines.push("");
  }

  if (buttondown?.status === "ok") {
    const metrics = buttondown.metrics || {};
    lines.push("*Subscribers*");
    lines.push(`- Total subscribers: ${formatNumber(metrics.subscriberCount)}`);
    lines.push(`- Added last 30 days: ${formatNumber(metrics.addedLast30Days)}`);
    lines.push(`- Added last 7 days: ${formatNumber(metrics.addedLast7Days)}`);
    lines.push("");
  }

  lines.push("*Engagement gaps*");
  lines.push("- Time spent: not tracked in current stack");
  lines.push("- Bounce rate: not tracked in current stack");
  lines.push("");
  lines.push("_If you want time spent and bounce rate, we need to add a product analytics layer such as Plausible or GA4._");

  return lines.join("\n").trim();
}

function formatRows(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "none yet";
  }

  return rows
    .slice(0, 3)
    .map((row) => row.key)
    .filter(Boolean)
    .join(", ");
}

function formatDateTime(value) {
  return new Date(value).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatPercent(value) {
  const number = Number(value || 0);
  return `${(number * 100).toFixed(1)}%`;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
