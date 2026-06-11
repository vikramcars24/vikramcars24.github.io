import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";

export function getSlackToken() {
  const token =
    process.env.SLACK_TOKEN ||
    process.env.SLACK_USER_TOKEN ||
    process.env.SLACK_BOT_TOKEN ||
    readTokenFromLocalFile();

  if (!token) {
    throw new Error(
      "Missing Slack token. Set SLACK_TOKEN, SLACK_USER_TOKEN, or SLACK_BOT_TOKEN, or create .slack-token in the project root."
    );
  }

  return token;
}

export async function slackApi(method, token, params = {}) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }

  const response = await fetch(`https://slack.com/api/${method}?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    const message = payload.error || `HTTP ${response.status}`;
    throw new Error(`Slack ${method} failed: ${message}`);
  }

  return payload;
}

export async function fetchConversationHistory(token, channel, options = {}) {
  const messages = [];
  let cursor = "";

  do {
    const payload = await slackApi("conversations.history", token, {
      channel,
      limit: options.limit || 200,
      oldest: options.oldest,
      latest: options.latest,
      cursor
    });

    messages.push(...(payload.messages || []));
    cursor = payload.response_metadata?.next_cursor || "";
  } while (cursor);

  return messages;
}

export async function fetchConversationReplies(token, channel, threadTs, options = {}) {
  const messages = [];
  let cursor = "";

  do {
    const payload = await slackApi("conversations.replies", token, {
      channel,
      ts: threadTs,
      limit: options.limit || 200,
      cursor
    });

    messages.push(...(payload.messages || []));
    cursor = payload.response_metadata?.next_cursor || "";
  } while (cursor);

  return messages;
}

export async function fetchConversationInfo(token, channel) {
  const payload = await slackApi("conversations.info", token, { channel });
  return payload.channel || {};
}

export async function fetchUserInfo(token, user) {
  const payload = await slackApi("users.info", token, { user });
  return payload.user || {};
}

export async function downloadFile(url, token, destination) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Slack file download failed: HTTP ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destination, bytes);
}

export async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

export function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");
}

export function extractFileId(target) {
  if (/^F[A-Z0-9]+$/i.test(target)) {
    return target;
  }

  try {
    const url = new URL(target);
    const parts = url.pathname.split("/").filter(Boolean);
    const fileIndex = parts.findIndex((part) => part.toLowerCase() === "files");

    if (fileIndex !== -1 && parts[fileIndex + 2]) {
      return parts[fileIndex + 2];
    }
  } catch {
    return "";
  }

  return "";
}

export function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function readTokenFromLocalFile() {
  const candidates = [
    path.join(process.cwd(), ".slack-token"),
    path.join(process.cwd(), ".slack-token.sh"),
    path.join(process.env.HOME || "", ".slack-token"),
    path.join(process.env.HOME || "", ".slack-token.sh")
  ];

  for (const candidate of candidates) {
    try {
      const raw = requireCleanString(candidate);
      if (!raw) {
        continue;
      }

      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }

        const match = trimmed.match(/^(?:export\s+)?(SLACK_TOKEN|SLACK_USER_TOKEN|SLACK_BOT_TOKEN)\s*=\s*(.+)$/);
        if (!match) {
          continue;
        }

        const value = stripQuotes(match[2].trim());
        if (value) {
          return value;
        }
      }
    } catch {
      // Ignore missing or unreadable local token files.
    }
  }

  return "";
}

function requireCleanString(filePath) {
  return readFileSync(filePath, "utf8");
}

function stripQuotes(value) {
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
