import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";

const usage = `
Usage:
  SLACK_TOKEN=xoxp-or-xoxb npm run slack:api -- <command> [options]

Commands:
  channel <channel-id> [--limit N] [--oldest TS] [--latest TS]
  thread <channel-id> <thread-ts> [--limit N]
  file-info <file-id-or-url>
  download <file-id-or-url> [--out <path>]
  user <user-id>
`.trim();

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.help || !parsed.command) {
    console.log(usage);
    process.exit(parsed.help ? 0 : 1);
  }

  const token = getSlackToken();

  switch (parsed.command) {
    case "channel":
      return runChannel(token, parsed);
    case "thread":
      return runThread(token, parsed);
    case "file-info":
      return runFileInfo(token, parsed);
    case "download":
      return runDownload(token, parsed);
    case "user":
      return runUser(token, parsed);
    default:
      throw new Error(`Unknown command "${parsed.command}".`);
  }
}

async function runChannel(token, parsed) {
  const channelId = parsed.positionals[0];
  if (!channelId) {
    throw new Error("Missing channel ID.");
  }

  const payload = await slackApi("conversations.history", token, {
    channel: channelId,
    limit: parsed.limit,
    oldest: parsed.oldest,
    latest: parsed.latest
  });

  printJson({
    channel: channelId,
    count: payload.messages?.length || 0,
    has_more: payload.has_more || false,
    next_cursor: payload.response_metadata?.next_cursor || "",
    messages: payload.messages || []
  });
}

async function runThread(token, parsed) {
  const channelId = parsed.positionals[0];
  const threadTs = parsed.positionals[1];

  if (!channelId || !threadTs) {
    throw new Error("Missing channel ID or thread timestamp.");
  }

  const payload = await slackApi("conversations.replies", token, {
    channel: channelId,
    ts: threadTs,
    limit: parsed.limit
  });

  printJson({
    channel: channelId,
    thread_ts: threadTs,
    count: payload.messages?.length || 0,
    has_more: payload.has_more || false,
    next_cursor: payload.response_metadata?.next_cursor || "",
    messages: payload.messages || []
  });
}

async function runFileInfo(token, parsed) {
  const target = parsed.positionals[0];
  if (!target) {
    throw new Error("Missing file ID or URL.");
  }

  const fileId = extractFileId(target);
  if (!fileId) {
    throw new Error(`Could not determine a Slack file ID from "${target}".`);
  }

  const file = await fetchFileInfo(fileId, token);
  printJson(file);
}

async function runDownload(token, parsed) {
  const target = parsed.positionals[0];
  if (!target) {
    throw new Error("Missing file ID or URL.");
  }

  const fileId = extractFileId(target);
  if (!fileId) {
    throw new Error(`Could not determine a Slack file ID from "${target}".`);
  }

  const file = await fetchFileInfo(fileId, token);
  const downloadUrl = file.url_private_download || file.url_private;

  if (!downloadUrl) {
    throw new Error(`Slack did not return a private download URL for file ${fileId}.`);
  }

  const destination = parsed.outPath
    ? path.resolve(process.cwd(), parsed.outPath)
    : path.join(process.cwd(), "downloads", sanitizeFileName(file.name || `${fileId}.bin`));

  await ensureDir(path.dirname(destination));
  await downloadFile(downloadUrl, token, destination);

  printJson({
    ok: true,
    file_id: file.id,
    name: file.name || "",
    path: destination
  });
}

async function runUser(token, parsed) {
  const userId = parsed.positionals[0];
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  const payload = await slackApi("users.info", token, {
    user: userId
  });

  printJson(payload.user || {});
}

function parseArgs(args) {
  const result = {
    command: "",
    positionals: [],
    outPath: "",
    oldest: "",
    latest: "",
    limit: "",
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === "--help" || current === "-h") {
      result.help = true;
      continue;
    }

    if (current === "--out") {
      result.outPath = args[index + 1] || "";
      index += 1;
      continue;
    }

    if (current === "--oldest") {
      result.oldest = args[index + 1] || "";
      index += 1;
      continue;
    }

    if (current === "--latest") {
      result.latest = args[index + 1] || "";
      index += 1;
      continue;
    }

    if (current === "--limit") {
      result.limit = args[index + 1] || "";
      index += 1;
      continue;
    }

    if (!result.command) {
      result.command = current;
      continue;
    }

    result.positionals.push(current);
  }

  return result;
}

function getSlackToken() {
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

function extractFileId(target) {
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

async function fetchFileInfo(fileId, token) {
  const payload = await slackApi("files.info", token, { file: fileId });
  return payload.file;
}

async function slackApi(method, token, params = {}) {
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

async function downloadFile(url, token, destination) {
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

async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
