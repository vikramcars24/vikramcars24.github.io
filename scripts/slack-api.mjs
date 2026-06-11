import { promises as fs } from "node:fs";
import path from "node:path";
import {
  downloadFile,
  ensureDir,
  extractFileId,
  fetchConversationReplies,
  getSlackToken,
  printJson,
  sanitizeFileName,
  slackApi
} from "./lib/slack-client.mjs";

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

async function fetchFileInfo(fileId, token) {
  const payload = await slackApi("files.info", token, { file: fileId });
  return payload.file;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
