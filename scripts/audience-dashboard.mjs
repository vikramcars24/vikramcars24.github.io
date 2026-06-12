import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sitePath = (...parts) => path.join(rootDir, ...parts);
const reportDir = sitePath("tmp");
const reportJsonPath = path.join(reportDir, "audience-dashboard.json");
const reportMdPath = path.join(reportDir, "audience-dashboard.md");

async function main() {
  const site = JSON.parse(await fs.readFile(sitePath("content", "site.json"), "utf8"));
  const domain = new URL(site.domain).origin;
  const now = new Date();

  const providerCollectors = [
    ["Site Ops", () => collectSiteOps()],
    ["Google Search Console", () => collectSearchConsole(site, now)],
    ["Cloudflare", () => collectCloudflare(site, now)],
    ["Buttondown", () => collectButtondown(now)]
  ];

  const providerResults = await Promise.allSettled(
    providerCollectors.map(([, collect]) => collect())
  );

  const providers = providerResults.map((result, index) => {
    const [name] = providerCollectors[index];
    if (result.status === "fulfilled") {
      return result.value;
    }

    const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
    return {
      name,
      status: "error",
      message,
      metrics: {}
    };
  });

  const summary = {
    generatedAt: now.toISOString(),
    domain,
    providers
  };

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(reportJsonPath, JSON.stringify(summary, null, 2), "utf8");
  await fs.writeFile(reportMdPath, renderMarkdown(summary), "utf8");

  const failing = providers.filter((provider) => provider.status === "error");
  const skippedProviders = providers.filter((provider) => provider.status === "skipped");

  if (failing.length > 0 || skippedProviders.length > 0) {
    console.log(`Audience dashboard written to ${reportMdPath} with partial provider coverage.`);
    for (const provider of failing) {
      console.error(`WARN: ${provider.name}: ${provider.message}`);
    }
    for (const provider of skippedProviders) {
      console.log(`SKIP: ${provider.name}: ${provider.message}`);
    }
    return;
  }

  console.log(`Audience dashboard written to ${reportMdPath}`);
}

async function collectSiteOps() {
  const reportFile = sitePath("tmp", "site-health-report.md");
  const lighthouseFile = sitePath("tmp", "lighthouse-report.md");
  try {
    const [health, lighthouse] = await Promise.allSettled([
      fs.readFile(reportFile, "utf8"),
      fs.readFile(lighthouseFile, "utf8")
    ]);

    return {
      name: "Site Ops",
      status: "ok",
      message: "Local monitoring reports available.",
      metrics: {
        liveHealthReport: health.status === "fulfilled",
        lighthouseReport: lighthouse.status === "fulfilled"
      }
    };
  } catch (error) {
    return {
      name: "Site Ops",
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      metrics: {}
    };
  }
}

async function collectSearchConsole(site, now) {
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || ensureTrailingSlash(site.domain);

  try {
    const token = await getGoogleAccessToken();
    if (!token) {
      return skipped("Google Search Console", "Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SEARCH_CONSOLE_TOKEN to enable Search Console reporting.");
    }

    const last7 = dateRangeDaysAgo(now, 7, 0);
    const prev7 = dateRangeDaysAgo(now, 14, 7);
    const last28 = dateRangeDaysAgo(now, 28, 0);

    const [totals7, totalsPrev7, totals28, topQueries, topPages] = await Promise.all([
      querySearchConsole(siteUrl, token, {
        startDate: last7.start,
        endDate: last7.end
      }),
      querySearchConsole(siteUrl, token, {
        startDate: prev7.start,
        endDate: prev7.end
      }),
      querySearchConsole(siteUrl, token, {
        startDate: last28.start,
        endDate: last28.end
      }),
      querySearchConsole(siteUrl, token, {
        startDate: last7.start,
        endDate: last7.end,
        dimensions: ["query"],
        rowLimit: 5
      }),
      querySearchConsole(siteUrl, token, {
        startDate: last7.start,
        endDate: last7.end,
        dimensions: ["page"],
        rowLimit: 5
      })
    ]);

    return {
      name: "Google Search Console",
      status: "ok",
      message: `Search performance for ${siteUrl}`,
      metrics: {
        siteUrl,
        last7Days: normalizeSearchConsoleTotals(totals7),
        previous7Days: normalizeSearchConsoleTotals(totalsPrev7),
        last28Days: normalizeSearchConsoleTotals(totals28),
        topQueries: normalizeSearchConsoleRows(topQueries),
        topPages: normalizeSearchConsoleRows(topPages)
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isSearchConsoleSetupBlocker(message) || isGoogleAuthSetupBlocker(message)) {
      return skipped("Google Search Console", message);
    }
    return {
      name: "Google Search Console",
      status: "error",
      message,
      metrics: { siteUrl }
    };
  }
}

async function collectCloudflare(site, now) {
  const token = process.env.CLOUDFLARE_API_TOKEN || "";
  const zoneId = process.env.CLOUDFLARE_ZONE_ID || "";

  if (!token || !zoneId) {
    return skipped("Cloudflare", "Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID to enable traffic analytics.");
  }

  try {
    const last7 = dateRangeDaysAgo(now, 7, 0);
    const payload = await fetchJson("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `
          query($zoneTag: string, $start: Date!, $end: Date!) {
            viewer {
              zones(filter: { zoneTag: $zoneTag }) {
                httpRequests1dGroups(limit: 7, filter: { date_geq: $start, date_leq: $end }) {
                  dimensions {
                    date
                  }
                  sum {
                    bytes
                    cachedBytes
                    cachedRequests
                    pageViews
                    requests
                    threats
                  }
                  uniq {
                    uniques
                  }
                }
              }
            }
          }
        `,
        variables: {
          zoneTag: zoneId,
          start: last7.start,
          end: last7.end
        }
      })
    });

    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      throw new Error(payload.errors.map((error) => error.message || String(error)).join("; "));
    }

    const groups = payload?.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
    const totals = groups.reduce(
      (acc, group) => {
        const sum = group?.sum || {};
        const uniq = group?.uniq || {};
        acc.requests += numberOrZero(sum.requests);
        acc.cachedRequests += numberOrZero(sum.cachedRequests);
        acc.bandwidthBytes += numberOrZero(sum.bytes);
        acc.cachedBandwidthBytes += numberOrZero(sum.cachedBytes);
        acc.pageViews += numberOrZero(sum.pageViews);
        acc.uniques += numberOrZero(uniq.uniques);
        acc.threats += numberOrZero(sum.threats);
        return acc;
      },
      {
        requests: 0,
        cachedRequests: 0,
        bandwidthBytes: 0,
        cachedBandwidthBytes: 0,
        pageViews: 0,
        uniques: 0,
        threats: 0
      }
    );

    return {
      name: "Cloudflare",
      status: "ok",
      message: `Traffic analytics for ${site.domain}`,
      metrics: {
        zoneId,
        last7Days: {
          requests: totals.requests,
          cachedRequests: totals.cachedRequests,
          uncachedRequests: Math.max(totals.requests - totals.cachedRequests, 0),
          cacheRatio: safePercent(totals.cachedRequests, totals.requests),
          bandwidthBytes: totals.bandwidthBytes,
          cachedBandwidthBytes: totals.cachedBandwidthBytes,
          pageViews: totals.pageViews,
          uniques: totals.uniques,
          threats: totals.threats
        }
      }
    };
  } catch (error) {
    return {
      name: "Cloudflare",
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      metrics: { zoneId }
    };
  }
}

async function collectButtondown(now) {
  const apiKey = process.env.BUTTONDOWN_API_KEY || "";
  const apiVersion = process.env.BUTTONDOWN_API_VERSION || "2024-07-01";

  if (!apiKey) {
    return skipped("Buttondown", "Set BUTTONDOWN_API_KEY to enable subscriber reporting.");
  }

  try {
    const subscribers = await listButtondown("subscribers", apiKey, apiVersion);
    const emails = await listButtondown("emails?status=sent&ordering=-publish_date&page_size=5", apiKey, apiVersion);

    const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const cutoff7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const subscriberRows = subscribers.results || [];
    const countsByType = countBy(subscriberRows, (row) => String(row.type || "unknown"));

    return {
      name: "Buttondown",
      status: "ok",
      message: "Subscriber and recent email activity available.",
      metrics: {
        subscriberCount: numberOrZero(subscribers.count),
        subscriberTypes: countsByType,
        addedLast30Days: subscriberRows.filter((row) => parseDate(row.creation_date) >= cutoff30).length,
        addedLast7Days: subscriberRows.filter((row) => parseDate(row.creation_date) >= cutoff7).length,
        recentEmails: (emails.results || []).slice(0, 5).map((email) => ({
          subject: email.subject || "",
          publishDate: email.publish_date || "",
          status: email.status || "",
          absoluteUrl: email.absolute_url || ""
        }))
      }
    };
  } catch (error) {
    return {
      name: "Buttondown",
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      metrics: {}
    };
  }
}

async function listButtondown(resource, apiKey, apiVersion) {
  const baseUrl = `https://api.buttondown.com/v1/${resource}`;
  const all = [];
  let page = 1;
  let count = 0;
  let keepGoing = true;

  while (keepGoing) {
    const url = new URL(baseUrl);
    if (!String(resource).includes("page=")) {
      url.searchParams.set("page", String(page));
      if (!url.searchParams.has("page_size")) {
        url.searchParams.set("page_size", "100");
      }
    }

    const payload = await fetchJson(url.toString(), {
      headers: {
        Authorization: `Token ${apiKey}`,
        "X-API-Version": apiVersion
      }
    });

    const results = Array.isArray(payload?.results) ? payload.results : [];
    count = Math.max(count, numberOrZero(payload?.count));
    all.push(...results);

    const pageSize = Number(url.searchParams.get("page_size") || "100");
    page += 1;
    keepGoing = results.length === pageSize && (count === 0 || all.length < count);
  }

  return { count: count || all.length, results: all };
}

async function querySearchConsole(siteUrl, token, body) {
  const encodedSite = encodeURIComponent(siteUrl);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`;
  return fetchJson(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function getGoogleAccessToken() {
  const oauthClientJson = process.env.GOOGLE_OAUTH_CLIENT_JSON || "";
  const oauthRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || "";
  if (oauthClientJson && oauthRefreshToken) {
    const client = JSON.parse(oauthClientJson);
    const installed = client.installed || client.web || client;
    const response = await fetchJson(installed.token_uri || "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: installed.client_id,
        client_secret: installed.client_secret,
        refresh_token: oauthRefreshToken,
        grant_type: "refresh_token"
      }).toString()
    });

    return String(response.access_token || "");
  }

  const bearer = process.env.GOOGLE_SEARCH_CONSOLE_TOKEN || "";
  if (bearer) {
    return bearer;
  }

  const serviceAccountJson = await loadServiceAccountJson();
  if (!serviceAccountJson) {
    return "";
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  const scope = "https://www.googleapis.com/auth/webmasters.readonly";
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope,
    aud: serviceAccount.token_uri,
    exp: issuedAt + 3600,
    iat: issuedAt
  };

  const jwt = signJwt(serviceAccount.private_key, payload);
  const response = await fetchJson(serviceAccount.token_uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    }).toString()
  });

  return String(response.access_token || "");
}

async function loadServiceAccountJson() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    return fs.readFile(path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_FILE), "utf8");
  }

  return "";
}

function signJwt(privateKey, payload) {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(data), privateKey);
  return `${data}.${base64url(signature)}`;
}

function normalizeSearchConsoleTotals(payload) {
  const row = Array.isArray(payload?.rows) && payload.rows.length > 0 ? payload.rows[0] : payload;
  return {
    clicks: numberOrZero(row?.clicks),
    impressions: numberOrZero(row?.impressions),
    ctr: numberOrZero(row?.ctr),
    position: numberOrZero(row?.position)
  };
}

function normalizeSearchConsoleRows(payload) {
  return (payload?.rows || []).map((row) => ({
    key: Array.isArray(row.keys) ? row.keys.join(" · ") : "",
    clicks: numberOrZero(row.clicks),
    impressions: numberOrZero(row.impressions),
    ctr: numberOrZero(row.ctr),
    position: numberOrZero(row.position)
  }));
}

function renderMarkdown(summary) {
  const lines = [
    "# Audience Dashboard",
    "",
    `- Site: ${summary.domain}`,
    `- Generated: ${summary.generatedAt}`,
    ""
  ];

  for (const provider of summary.providers) {
    lines.push(`## ${provider.name}`);
    lines.push(`- Status: ${provider.status}`);
    lines.push(`- Note: ${provider.message}`);

    const metricLines = renderMetricLines(provider.metrics);
    if (metricLines.length > 0) {
      lines.push(...metricLines);
    }

    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

function renderMetricLines(metrics, prefix = "-") {
  if (!metrics || typeof metrics !== "object") {
    return [];
  }

  const lines = [];
  for (const [key, value] of Object.entries(metrics)) {
    const label = humanize(key);
    if (Array.isArray(value)) {
      lines.push(`${prefix} ${label}:`);
      for (const item of value) {
        lines.push(`  - ${formatMetricValue(item)}`);
      }
      continue;
    }
    if (value && typeof value === "object") {
      lines.push(`${prefix} ${label}:`);
      for (const [childKey, childValue] of Object.entries(value)) {
        lines.push(`  - ${humanize(childKey)}: ${formatMetricValue(childValue)}`);
      }
      continue;
    }
    lines.push(`${prefix} ${label}: ${formatMetricValue(value)}`);
  }
  return lines;
}

function formatMetricValue(value) {
  if (value === null || value === undefined || value === "") {
    return "n/a";
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return value.toLocaleString("en-US");
    }
    return value.toFixed(3);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function skipped(name, message) {
  return {
    name,
    status: "skipped",
    message,
    metrics: {}
  };
}

function isSearchConsoleSetupBlocker(message) {
  const text = String(message || "").toLowerCase();
  return text.includes("has not been used in project")
    || text.includes("it is disabled")
    || text.includes("insufficient permissions")
    || text.includes("you need additional access")
    || text.includes("resourcemanager.projects.get");
}

function isGoogleAuthSetupBlocker(message) {
  const text = String(message || "").toLowerCase();
  return text.includes("invalid_grant")
    || text.includes("invalid_client")
    || text.includes("unauthorized_client")
    || text.includes("redirect_uri_mismatch")
    || text.includes("bad request");
}

function dateRangeDaysAgo(now, daysBackStart, daysBackEnd) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBackEnd));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBackStart));
  return {
    start: formatDate(start),
    end: formatDate(new Date(end.getTime() - 24 * 60 * 60 * 1000))
  };
}

function ensureTrailingSlash(value) {
  return String(value).endsWith("/") ? String(value) : `${String(value)}/`;
}

function formatDate(value) {
  return value.toISOString().slice(0, 10);
}

function parseDate(value) {
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function safePercent(part, whole) {
  if (!whole) {
    return 0;
  }
  return part / whole;
}

function numberOrZero(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function humanize(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function base64url(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function countBy(items, selector) {
  const counts = {};
  for (const item of items) {
    const key = selector(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const message = payload?.error?.message
      || payload?.message
      || payload?.raw
      || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return payload;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
