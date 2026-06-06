import { promises as fs } from "node:fs";
import path from "node:path";

const usage = `
Usage:
  SLACK_TOKEN=xoxp-or-xoxb npm run slack:download -- <slack-file-id-or-url> [--out <path>]

Examples:
  SLACK_TOKEN=... npm run slack:download -- F0B5ZEB6S92
  SLACK_TOKEN=... npm run slack:download -- https://cars24.slack.com/files/U054KL2NR/F0B5ZEB6S92/flatland.pdf
  SLACK_TOKEN=... npm run slack:download -- F0B5ZEB6S92 --out downloads/flatland.pdf
`.trim();

async function main() {
  const { target, outPath, help } = parseArgs(process.argv.slice(2));

  if (help || !target) {
    console.log(usage);
    process.exit(help ? 0 : 1);
  }

  const token = getSlackToken();
  const fileId = extractFileId(target);

  if (!fileId) {
    throw new Error(`Could not determine a Slack file ID from "${target}".`);
  }

  const file = await fetchFileInfo(fileId, token);
  const downloadUrl = file.url_private_download || file.url_private;

  if (!downloadUrl) {
    throw new Error(`Slack did not return a private download URL for file ${fileId}.`);
  }

  const destination = outPath
    ? path.resolve(process.cwd(), outPath)
    : path.join(process.cwd(), "downloads", sanitizeFileName(file.name || `${fileId}.bin`));

  await ensureDir(path.dirname(destination));
  await downloadFile(downloadUrl, token, destination);

  console.log(`Downloaded ${file.id} to ${destination}`);
}

function parseArgs(args) {
  let target = "";
  let outPath = "";
  let help = false;

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === "--help" || current === "-h") {
      help = true;
      continue;
    }

    if (current === "--out") {
      outPath = args[index + 1] || "";
      index += 1;
      continue;
    }

    if (!target) {
      target = current;
    }
  }

  return { target, outPath, help };
}

function getSlackToken() {
  const token = process.env.SLACK_TOKEN || process.env.SLACK_USER_TOKEN || process.env.SLACK_BOT_TOKEN;

  if (!token) {
    throw new Error("Missing Slack token. Set SLACK_TOKEN, SLACK_USER_TOKEN, or SLACK_BOT_TOKEN.");
  }

  return token;
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
  const params = new URLSearchParams({ file: fileId });
  const response = await fetch(`https://slack.com/api/files.info?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    const message = payload.error || `HTTP ${response.status}`;
    throw new Error(`Slack files.info failed for ${fileId}: ${message}`);
  }

  return payload.file;
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

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
