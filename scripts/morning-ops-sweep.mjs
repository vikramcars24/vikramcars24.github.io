import { promises as fs } from "node:fs";
import path from "node:path";
import { getSlackToken, openDirectMessage, postMessage } from "./lib/slack-client.mjs";

const rootDir = process.cwd();
const reportDir = path.join(rootDir, "tmp");
const reportJsonPath = path.join(reportDir, "morning-ops-sweep.json");
const reportMdPath = path.join(reportDir, "morning-ops-sweep.md");
const defaultUserId = "U054KL2NR";
const githubApiUrl = process.env.GITHUB_API_URL || "https://api.github.com";
const githubServerUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
const dryRun = isTruthy(process.env.MORNING_OPS_DRY_RUN);

const workflowSpecs = [
  { name: "Deploy Site", slug: "deploy", issueLabel: "", issueTitle: "" },
  { name: "Site Ops", slug: "site-ops", issueLabel: "site-ops", issueTitle: "Site Ops Alert" },
  { name: "Audience Dashboard", slug: "audience-dashboard", issueLabel: "audience-dashboard", issueTitle: "Audience Dashboard Alert" },
  { name: "Monthly Site Report", slug: "monthly-site-report", issueLabel: "monthly-site-report", issueTitle: "Monthly Site Report Alert" }
];

async function main() {
  const report = await collectReport();

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(reportJsonPath, JSON.stringify(report, null, 2), "utf8");
  await fs.writeFile(reportMdPath, renderMarkdown(report), "utf8");

  await maybeSendSlack(report);

  console.log(renderConsoleSummary(report));
}

async function collectReport() {
  const now = new Date();
  const workflows = await collectWorkflowStatus();
  const issues = await collectAlertIssues();
  const gmail = await collectGmailTriage(workflows, issues);

  return {
    generatedAt: now.toISOString(),
    dryRun,
    trigger: resolveTrigger(),
    workflows,
    issues,
    gmail,
    needsAttention: workflows.some((workflow) => workflow.state !== "healthy") || issues.open.length > 0
  };
}

async function collectWorkflowStatus() {
  const repo = getRepo();
  const workflowsPayload = await fetchGitHubJson(`/repos/${repo.owner}/${repo.repo}/actions/workflows?per_page=100`);
  const available = new Map((workflowsPayload.workflows || []).map((workflow) => [workflow.name, workflow]));
  const statuses = [];

  for (const spec of workflowSpecs) {
    const workflow = available.get(spec.name);
    if (!workflow) {
      statuses.push({
        ...spec,
        state: "missing",
        summary: "Workflow not found in repository.",
        latestRun: null
      });
      continue;
    }

    const runsPayload = await fetchGitHubJson(
      `/repos/${repo.owner}/${repo.repo}/actions/workflows/${workflow.id}/runs?per_page=5`
    );
    const latest = runsPayload.workflow_runs?.[0] || null;

    statuses.push({
      ...spec,
      state: deriveWorkflowState(latest),
      summary: summarizeWorkflow(latest),
      latestRun: latest ? normalizeRun(latest) : null
    });
  }

  return statuses;
}

async function collectAlertIssues() {
  const repo = getRepo();
  const open = [];

  for (const spec of workflowSpecs) {
    if (!spec.issueLabel || !spec.issueTitle) {
      continue;
    }

    const payload = await fetchGitHubJson(
      `/repos/${repo.owner}/${repo.repo}/issues?state=open&labels=${encodeURIComponent(spec.issueLabel)}&per_page=20`
    );
    const matches = (payload || []).filter((issue) => issue.title === spec.issueTitle);

    for (const issue of matches) {
      open.push({
        workflow: spec.name,
        label: spec.issueLabel,
        title: issue.title,
        number: issue.number,
        url: issue.html_url,
        updatedAt: issue.updated_at
      });
    }
  }

  return { open };
}

async function collectGmailTriage(workflows, issues) {
  try {
    const token = await getGoogleAccessToken();
    if (!token) {
      return skippedGmail("Google OAuth credentials for Gmail are not configured.");
    }

    const labelMap = await listGmailLabels(token);
    const inboxMessages = await listGitHubOpsMessages(token);
    const messages = [];
    let trashedCount = 0;

    for (const message of inboxMessages) {
      const metadata = await getGmailMessageMetadata(token, message.id);
      const subject = findHeader(metadata.payload?.headers, "Subject");
      const from = findHeader(metadata.payload?.headers, "From");
      const category = categorizeGitHubMail(subject);
      const relatedWorkflow = matchWorkflow(category.workflowName, workflows);
      const openIssue = relatedWorkflow
        ? issues.open.some((issue) => issue.workflow === relatedWorkflow.name)
        : false;
      const isResolvedNoise = category.kind === "workflow-alert" &&
        relatedWorkflow &&
        relatedWorkflow.state === "healthy" &&
        !openIssue;

      if (isResolvedNoise) {
        if (!dryRun) {
          await modifyGmailMessage(token, message.id, {
            addLabelIds: labelMap.get("Ops/Resolved") ? [labelMap.get("Ops/Resolved")] : [],
            removeLabelIds: labelMap.get("INBOX") ? [labelMap.get("INBOX")] : []
          });
          await trashGmailMessage(token, message.id);
        }
        trashedCount += 1;
      }

      messages.push({
        id: message.id,
        subject,
        from,
        category: category.kind,
        workflow: relatedWorkflow?.name || category.workflowName || "",
        resolvedNoise: Boolean(isResolvedNoise),
        action: isResolvedNoise ? (dryRun ? "would-trash" : "trashed") : "kept"
      });
    }

    return {
      status: "ok",
      message: dryRun
        ? `Dry run classified ${messages.length} GitHub emails; ${trashedCount} would be cleared.`
        : `Classified ${messages.length} GitHub emails; cleared ${trashedCount} resolved alerts.`,
      messages,
      trashedCount
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isGoogleAuthSetupBlocker(message) || isGmailScopeBlocker(message)) {
      return skippedGmail(message);
    }
    return {
      status: "error",
      message,
      messages: [],
      trashedCount: 0
    };
  }
}

async function maybeSendSlack(report) {
  if (!shouldSendSlack(report)) {
    return;
  }

  let token;
  try {
    token = getSlackToken();
  } catch (error) {
    console.log(`Skipping Slack send: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  const userId = process.env.SLACK_REPORT_DM_USER || defaultUserId;
  const message = renderSlack(report);

  try {
    const dm = await openDirectMessage(token, userId);
    await postMessage(token, dm.id, message);
    console.log(`Morning ops sweep sent to Slack DM ${userId}`);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    if (messageText.includes("missing_scope")) {
      console.log(`Morning ops sweep not sent to Slack DM ${userId}: ${messageText}`);
      return;
    }

    throw error;
  }
}

function shouldSendSlack(report) {
  if (report.trigger === "schedule" || report.trigger === "workflow_dispatch") {
    return true;
  }

  if (report.needsAttention) {
    return true;
  }

  return report.gmail.status === "ok" && report.gmail.trashedCount > 0;
}

function renderSlack(report) {
  const lines = [
    "*Morning ops sweep*",
    `${renderHeadline(report)}`,
    `Generated: ${formatDateTime(report.generatedAt)}`,
    `Trigger: ${report.trigger}`,
    ""
  ];

  lines.push("*Workflows*");
  for (const workflow of report.workflows) {
    const runUrl = workflow.latestRun?.url ? ` <${workflow.latestRun.url}|open>` : "";
    lines.push(`- ${workflow.name}: ${workflow.state}. ${workflow.summary}${runUrl}`);
  }

  lines.push("");
  lines.push("*Open alert issues*");
  if (report.issues.open.length === 0) {
    lines.push("- none");
  } else {
    for (const issue of report.issues.open) {
      lines.push(`- ${issue.workflow}: <${issue.url}|#${issue.number}> updated ${formatRelative(issue.updatedAt)}`);
    }
  }

  lines.push("");
  lines.push("*Inbox sweep*");
  lines.push(`- ${report.gmail.message}`);
  const kept = report.gmail.messages.filter((message) => message.action === "kept").slice(0, 3);
  for (const message of kept) {
    lines.push(`- kept: ${message.subject}`);
  }

  return lines.join("\n").trim();
}

function renderMarkdown(report) {
  const lines = [
    "# Morning Ops Sweep",
    "",
    `- Generated: ${report.generatedAt}`,
    `- Trigger: ${report.trigger}`,
    `- Dry run: ${report.dryRun ? "yes" : "no"}`,
    `- Headline: ${renderHeadline(report)}`,
    ""
  ];

  lines.push("## Workflows");
  for (const workflow of report.workflows) {
    lines.push(`- ${workflow.name}: ${workflow.state}. ${workflow.summary}`);
    if (workflow.latestRun?.url) {
      lines.push(`  - Run: ${workflow.latestRun.url}`);
    }
  }

  lines.push("");
  lines.push("## Open Alert Issues");
  if (report.issues.open.length === 0) {
    lines.push("- none");
  } else {
    for (const issue of report.issues.open) {
      lines.push(`- ${issue.workflow}: #${issue.number} ${issue.url}`);
    }
  }

  lines.push("");
  lines.push("## Gmail Sweep");
  lines.push(`- Status: ${report.gmail.status}`);
  lines.push(`- Message: ${report.gmail.message}`);
  if (report.gmail.messages.length > 0) {
    lines.push(`- Trashed resolved alerts: ${report.gmail.trashedCount}`);
  }

  return lines.join("\n");
}

function renderConsoleSummary(report) {
  return [
    `Morning ops sweep written to ${reportMdPath}`,
    renderHeadline(report)
  ].join("\n");
}

function renderHeadline(report) {
  if (report.needsAttention) {
    return "Attention needed. At least one workflow or alert issue is still open.";
  }

  if (report.gmail.status === "ok" && report.gmail.trashedCount > 0) {
    return dryRun
      ? "System is green. Resolved alert mail would have been cleared."
      : "System is green. Resolved alert mail was cleared.";
  }

  return "System is green. No unresolved GitHub or site-ops signal is active.";
}

function resolveTrigger() {
  if (process.env.GITHUB_EVENT_NAME === "workflow_run") {
    return "workflow_run";
  }
  return process.env.GITHUB_EVENT_NAME || "manual";
}

function deriveWorkflowState(run) {
  if (!run) {
    return "missing-run";
  }
  if (run.status !== "completed") {
    return "running";
  }
  if (run.conclusion === "success") {
    return "healthy";
  }
  if (run.conclusion === "neutral" || run.conclusion === "skipped") {
    return "neutral";
  }
  return "failing";
}

function summarizeWorkflow(run) {
  if (!run) {
    return "No recent run found.";
  }
  if (run.status !== "completed") {
    return `Run ${run.run_number} is ${run.status}.`;
  }
  return `Run ${run.run_number} ${run.conclusion} on ${formatDateTime(run.updated_at)}.`;
}

function normalizeRun(run) {
  return {
    id: run.id,
    number: run.run_number,
    status: run.status,
    conclusion: run.conclusion,
    updatedAt: run.updated_at,
    url: run.html_url
  };
}

function matchWorkflow(name, workflows) {
  if (!name) {
    return null;
  }
  return workflows.find((workflow) => workflow.name === name) || null;
}

function categorizeGitHubMail(subject) {
  const normalized = subject.toLowerCase();

  if (normalized.includes("site ops")) {
    return { kind: "workflow-alert", workflowName: "Site Ops" };
  }
  if (normalized.includes("audience dashboard")) {
    return { kind: "workflow-alert", workflowName: "Audience Dashboard" };
  }
  if (normalized.includes("monthly site report")) {
    return { kind: "workflow-alert", workflowName: "Monthly Site Report" };
  }
  if (normalized.includes("deploy site")) {
    return { kind: "workflow-alert", workflowName: "Deploy Site" };
  }
  if (normalized.includes("permission") || normalized.includes("installed on account") || normalized.includes("access")) {
    return { kind: "security", workflowName: "" };
  }

  return { kind: "other", workflowName: "" };
}

async function listGitHubOpsMessages(token) {
  const query = [
    "in:inbox",
    "(from:noreply@github.com OR from:notifications@github.com)",
    "newer_than:7d",
    "(\"Site Ops\" OR \"Deploy Site\" OR \"Audience Dashboard\" OR \"Monthly Site Report\" OR \"vikramcars24.github.io\")"
  ].join(" ");
  const response = await fetchJson(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=25`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.messages || [];
}

async function listGmailLabels(token) {
  const response = await fetchJson("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const labels = new Map((response.labels || []).map((label) => [label.name, label.id]));
  if (!labels.has("Ops/Resolved")) {
    const created = await fetchJson("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Ops/Resolved",
        labelListVisibility: "labelShow",
        messageListVisibility: "show"
      })
    });
    labels.set(created.name, created.id);
  }
  return labels;
}

async function getGmailMessageMetadata(token, messageId) {
  return fetchJson(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
}

async function modifyGmailMessage(token, messageId, body) {
  return fetchJson(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function trashGmailMessage(token, messageId) {
  return fetchJson(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

function findHeader(headers = [], name) {
  const header = headers.find((item) => item.name?.toLowerCase() === name.toLowerCase());
  return header?.value || "";
}

async function getGoogleAccessToken() {
  const directToken = (process.env.GOOGLE_GMAIL_ACCESS_TOKEN || "").trim();
  if (directToken) {
    return directToken;
  }

  const refreshToken = (process.env.GOOGLE_OAUTH_REFRESH_TOKEN || "").trim();
  const clientJson = (process.env.GOOGLE_OAUTH_CLIENT_JSON || "").trim();
  if (!refreshToken || !clientJson) {
    return "";
  }

  const client = JSON.parse(clientJson);
  const source = client.installed || client.web || client;
  const clientId = source.client_id;
  const clientSecret = source.client_secret;
  const tokenUri = source.token_uri || "https://oauth2.googleapis.com/token";

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_JSON is missing client_id or client_secret.");
  }

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || `Google token exchange failed: HTTP ${response.status}`);
  }

  return payload.access_token;
}

function skippedGmail(message) {
  return {
    status: "skipped",
    message,
    messages: [],
    trashedCount: 0
  };
}

function isGoogleAuthSetupBlocker(message) {
  const normalized = String(message || "").toLowerCase();
  return [
    "invalid_grant",
    "invalid_rapt",
    "invalid_client",
    "unauthorized_client",
    "redirect_uri_mismatch",
    "bad request",
    "missing client_id",
    "missing client_secret"
  ].some((fragment) => normalized.includes(fragment));
}

function isGmailScopeBlocker(message) {
  const normalized = String(message || "").toLowerCase();
  return normalized.includes("insufficient authentication scopes") ||
    normalized.includes("request had insufficient authentication scopes") ||
    normalized.includes("metadata scope") ||
    normalized.includes("permission denied");
}

function getRepo() {
  const raw = process.env.GITHUB_REPOSITORY || "";
  const [owner, repo] = raw.split("/");
  if (!owner || !repo) {
    throw new Error("Missing GITHUB_REPOSITORY.");
  }
  return { owner, repo };
}

async function fetchGitHubJson(resource, options = {}) {
  const token = (process.env.GITHUB_TOKEN || "").trim();
  if (!token) {
    throw new Error("Missing GITHUB_TOKEN.");
  }

  return fetchJson(`${githubApiUrl}${resource}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message =
      payload?.error_description ||
      payload?.error?.message ||
      payload?.error ||
      payload?.message ||
      `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function formatDateTime(value) {
  return new Date(value).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function formatRelative(value) {
  const deltaMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(Math.round(deltaMs / 60000), 0);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function isTruthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
