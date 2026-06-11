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
  const plausible = providers.get("Plausible");
  const traffic = cloudflare?.metrics?.last7Days || {};
  const searchMetrics = search?.metrics || {};
  const subscriberMetrics = buttondown?.metrics || {};
  const engagement = plausible?.metrics || {};

  const lines = [
    `*Monthly site brief*`,
    `${report.domain}`,
    `${headline(report)}`,
    `Generated: ${formatDateTime(report.generatedAt)}`,
    ""
  ];

  lines.push("*1. Reach*");
  lines.push(`- Readers last 7 days: ${formatNumber(prefer(engagement.visitors, traffic.uniques))}`);
  lines.push(`- Page views last 7 days: ${formatNumber(prefer(engagement.pageviews, traffic.pageViews))}`);
  lines.push(`- Requests last 7 days: ${formatNumber(traffic.requests)}`);
  lines.push("");

  lines.push("*2. Discovery*");
  lines.push(`- Search impressions last 28 days: ${formatNumber(searchMetrics.last28Days?.impressions)}`);
  lines.push(`- Search clicks last 28 days: ${formatNumber(searchMetrics.last28Days?.clicks)}`);
  lines.push(`- Search CTR: ${formatPercent(searchMetrics.last28Days?.ctr)}`);
  lines.push(`- What people are finding: ${formatRows(searchMetrics.topQueries)}`);
  lines.push(`- Pages Google is surfacing: ${formatRows(searchMetrics.topPages)}`);
  lines.push("");

  lines.push("*3. Conversion*");
  lines.push(`- Subscribers total: ${formatNumber(subscriberMetrics.subscriberCount)}`);
  lines.push(`- New subscribers last 30 days: ${formatNumber(subscriberMetrics.addedLast30Days)}`);
  lines.push(`- New subscribers last 7 days: ${formatNumber(subscriberMetrics.addedLast7Days)}`);
  lines.push("");

  lines.push("*4. Engagement*");
  lines.push(`- Time on site: ${formatDuration(engagement.visitDuration)}`);
  lines.push(`- Bounce rate: ${formatPercentOrPending(engagement.bounceRate)}`);
  lines.push(`- Time on page: ${formatDuration(engagement.timeOnPage)}`);
  lines.push("");

  lines.push("*5. Watchlist*");
  lines.push(...buildWatchlist({ search, plausible, buttondown, cloudflare }));

  return lines.join("\n").trim();
}

function headline(report) {
  const providers = new Map(report.providers.map((provider) => [provider.name, provider]));
  const search = providers.get("Google Search Console");
  const cloudflare = providers.get("Cloudflare");
  const buttondown = providers.get("Buttondown");
  const pageViews = Number(cloudflare?.metrics?.last7Days?.pageViews || 0);
  const impressions = Number(search?.metrics?.last28Days?.impressions || 0);
  const subscribers = Number(buttondown?.metrics?.subscriberCount || 0);

  if (pageViews === 0 && impressions === 0) {
    return "_Still pre-distribution. The site is healthy, but audience formation has not started yet._";
  }

  if (pageViews < 500 && subscribers < 100) {
    return "_Early signal stage. The site is live, indexable, and beginning to gather traffic, but distribution is still thin._";
  }

  return "_The site is attracting measurable attention. The next question is whether that attention compounds into subscribers and repeat readers._";
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

function formatPercentOrPending(value) {
  return value === undefined || value === null ? "pending Plausible" : formatPercent(value);
}

function formatDuration(value) {
  const seconds = Number(value || 0);
  if (!seconds) {
    return "pending Plausible";
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${remainder}s`;
}

function prefer(primary, fallback) {
  if (primary !== undefined && primary !== null) {
    return primary;
  }

  return fallback;
}

function buildWatchlist({ search, plausible, buttondown, cloudflare }) {
  const items = [];

  if (Number(search?.metrics?.last28Days?.impressions || 0) === 0) {
    items.push("- Search footprint is still effectively zero. The main job is indexing and distribution.");
  }

  if (Number(buttondown?.metrics?.subscriberCount || 0) === 0) {
    items.push("- Subscriber base is still at zero. The first milestone is getting the loop from essay to email capture working.");
  }

  if (!plausible) {
    items.push("- Engagement quality is still blind. Add Plausible to unlock bounce rate and time spent.");
  }

  if (Number(cloudflare?.metrics?.last7Days?.cacheRatio || 0) < 0.2) {
    items.push("- Cache hit rate is low. Worth checking image and asset caching once traffic grows.");
  }

  if (items.length === 0) {
    items.push("- No immediate distribution or infrastructure warning signs.");
  }

  items.push("");
  items.push("_Best steady-state metrics to track here: readers, page views, search impressions, search clicks, subscriber growth, bounce rate, visit duration, and top landing pages._");

  return items;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
