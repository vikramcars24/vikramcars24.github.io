import { getUnipileConfig, listChatMessages, listChats, listWhatsAppAccounts } from "./unipile-utils.mjs";

const { dsn, apiKey } = getUnipileConfig();
const args = process.argv.slice(2);
const chatLimit = readNumericFlag(args, "--chats", 20);
const messageLimit = readNumericFlag(args, "--messages", 20);
const explicitAccountId = readAccountId(args);

if (!dsn || !apiKey) {
  console.error("Missing UNIPILE_DSN or UNIPILE_API_KEY.");
  console.error("The script checks this repo's .env files and /Users/vikram/Desktop/unipile/.env automatically.");
  process.exit(1);
}

try {
  const accountId = explicitAccountId || process.env.UNIPILE_WHATSAPP_ACCOUNT_ID || (await findWhatsAppAccountId());
  const chats = await listChats({ dsn, apiKey, accountId, limit: chatLimit });

  console.log(`WhatsApp account_id: ${accountId}`);
  console.log(`${chats.items.length} chat(s):`);
  console.log("");

  for (const chat of chats.items) {
    const name = chat.name || chat.provider_id || "(unnamed chat)";
    const unreadSuffix = chat.unread_count ? ` | unread: ${chat.unread_count}` : "";
    console.log(`- ${chat.id} | ${name}${unreadSuffix}`);
  }

  if (!chats.items.length) {
    console.log("");
    console.log("No chats returned.");
    process.exit(0);
  }

  const latestChat = chats.items[0];
  const messages = await listChatMessages({
    dsn,
    apiKey,
    chatId: latestChat.id,
    limit: messageLimit
  });

  console.log("");
  console.log(`Latest chat: ${latestChat.id} | ${latestChat.name || latestChat.provider_id || "(unnamed chat)"}`);
  console.log(`Showing up to ${messageLimit} most recent message(s):`);
  console.log("");

  for (const message of (messages.items || []).slice().reverse()) {
    const sender = message.is_sender ? "me" : message.sender_id || "them";
    const text = message.text ? collapseWhitespace(message.text) : "(no text)";
    console.log(`[${sender}] ${text}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function findWhatsAppAccountId() {
  const accounts = await listWhatsAppAccounts({ dsn, apiKey });

  if (!accounts.length) {
    throw new Error("No WhatsApp account is currently linked in UniPile.");
  }

  return accounts[0].id;
}

function readNumericFlag(args, flagName, fallback) {
  const index = args.indexOf(flagName);

  if (index === -1) {
    return fallback;
  }

  const rawValue = args[index + 1];
  const parsed = Number.parseInt(rawValue || "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flagName} must be followed by a positive integer.`);
  }

  return parsed;
}

function readAccountId(args) {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "--chats" || value === "--messages") {
      index += 1;
      continue;
    }

    if (!value.startsWith("--")) {
      return value;
    }
  }

  return undefined;
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}
