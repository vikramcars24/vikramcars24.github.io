import { existsSync, readFileSync } from "node:fs";

export function loadEnvFallbacks() {
  const envFiles = [
    `${process.cwd()}/.env`,
    `${process.cwd()}/.env.local`,
    "/Users/vikram/Desktop/unipile/.env"
  ];

  for (const filePath of envFiles) {
    if (!existsSync(filePath)) {
      continue;
    }

    const content = readFileSync(filePath, "utf8");
    applyEnvText(content);
  }
}

export function getUnipileConfig() {
  loadEnvFallbacks();

  return {
    dsn: process.env.UNIPILE_DSN,
    apiKey: process.env.UNIPILE_API_KEY
  };
}

export function normalizeDsn(dsn) {
  return dsn.replace(/\/+$/, "");
}

export async function listAccounts({ dsn, apiKey, limit = 100 }) {
  return unipileFetchJson(`/api/v1/accounts?limit=${limit}`, {
    dsn,
    apiKey
  });
}

export async function listWhatsAppAccounts({ dsn, apiKey, limit = 100 }) {
  const data = await listAccounts({ dsn, apiKey, limit });
  return (data.items || []).filter((account) => account.type === "WHATSAPP");
}

export async function listChats({ dsn, apiKey, accountId, limit = 20 }) {
  const search = new URLSearchParams({ limit: String(limit) });

  if (accountId) {
    search.set("account_id", accountId);
  }

  return unipileFetchJson(`/api/v1/chats?${search.toString()}`, {
    dsn,
    apiKey
  });
}

export async function listChatMessages({ dsn, apiKey, chatId, limit = 20 }) {
  const search = new URLSearchParams({ limit: String(limit) });

  return unipileFetchJson(`/api/v1/chats/${encodeURIComponent(chatId)}/messages?${search.toString()}`, {
    dsn,
    apiKey
  });
}

async function unipileFetchJson(path, { dsn, apiKey, method = "GET" }) {
  if (!dsn || !apiKey) {
    throw new Error("Missing UNIPILE_DSN or UNIPILE_API_KEY.");
  }

  const response = await fetch(`${normalizeDsn(dsn)}${path}`, {
    method,
    headers: {
      "X-API-KEY": apiKey,
      accept: "application/json"
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const details = data ? JSON.stringify(data, null, 2) : await response.text();
    throw new Error(`UniPile request failed (${response.status}): ${details}`);
  }

  return data;
}

function applyEnvText(content) {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
