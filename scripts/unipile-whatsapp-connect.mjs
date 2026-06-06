import http from "node:http";
import { URL } from "node:url";
import { getUnipileConfig, listWhatsAppAccounts } from "./unipile-utils.mjs";

const { dsn, apiKey } = getUnipileConfig();
const redirectUri = process.env.UNIPILE_REDIRECT_URI || "http://127.0.0.1:8787/unipile/callback";
const expiresMinutes = Number.parseInt(process.env.UNIPILE_LINK_EXPIRES_MINUTES || "10", 10);
const authDomain = process.env.UNIPILE_AUTH_DOMAIN;
const waitForSync = process.env.UNIPILE_WAIT_FOR_SYNC === "true";

if (!apiKey) {
  console.error("Missing UNIPILE_API_KEY.");
  console.error("Example:");
  console.error("UNIPILE_API_KEY=your_api_key npm run whatsapp:connect");
  process.exit(1);
}

if (!Number.isFinite(expiresMinutes) || expiresMinutes <= 0) {
  console.error("UNIPILE_LINK_EXPIRES_MINUTES must be a positive integer.");
  process.exit(1);
}

const callbackUrl = new URL(redirectUri);
const isLocalCallback =
  (callbackUrl.hostname === "127.0.0.1" || callbackUrl.hostname === "localhost") &&
  callbackUrl.pathname === "/unipile/callback";

let callbackServer;

try {
  if (dsn) {
    const existingAccounts = await listWhatsAppAccounts({ dsn, apiKey });

    if (existingAccounts.length > 0) {
      console.log("");
      console.log("Existing UniPile WhatsApp account found:");

      for (const account of existingAccounts) {
        console.log(`- account_id: ${account.id}`);
        console.log(`  name: ${account.name || "(unnamed)"}`);
        console.log(`  type: ${account.type}`);
      }

      process.exit(0);
    }
  }

  if (isLocalCallback) {
    callbackServer = await startCallbackServer(callbackUrl);
  }

  const authLink = await createWhatsAppAuthLink({
    apiKey,
    redirectUri,
    expiresMinutes,
    authDomain,
    waitForSync
  });

  console.log("");
  console.log("UniPile WhatsApp auth link:");
  console.log(authLink);
  console.log("");
  console.log("Next step:");
  console.log("1. Open the link above.");
  console.log("2. Choose WhatsApp in the UniPile Hosted Auth flow.");
  console.log("3. Scan the QR code from the WhatsApp app on your phone.");

  if (isLocalCallback) {
    console.log("");
    console.log(`Waiting for callback on ${redirectUri}`);
    console.log("Press Ctrl+C to stop listening.");
  } else if (callbackServer) {
    callbackServer.close();
  }
} catch (error) {
  if (callbackServer) {
    callbackServer.close();
  }

  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function createWhatsAppAuthLink({ apiKey, redirectUri, expiresMinutes, authDomain, waitForSync }) {
  const expiresOn = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();
  const payload = {
    providers: "WHATSAPP",
    redirect_uri: redirectUri,
    expires_on: expiresOn
  };

  if (authDomain) {
    payload.domain = authDomain;
  }

  if (waitForSync) {
    payload.config = {
      global: {
        wait_for_sync: true
      }
    };
  }

  const response = await fetch("https://api.unipile.com/v2/auth/link", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const details = data ? JSON.stringify(data, null, 2) : await response.text();
    throw new Error(`UniPile auth link request failed (${response.status}): ${details}`);
  }

  const link = data?.link || data?.data?.link;

  if (!link) {
    throw new Error(`UniPile response did not include an auth link: ${JSON.stringify(data, null, 2)}`);
  }

  return link;
}

function startCallbackServer(callbackUrl) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        res.end("Missing request URL");
        return;
      }

      const requestUrl = new URL(req.url, `${callbackUrl.protocol}//${callbackUrl.host}`);

      if (requestUrl.pathname !== callbackUrl.pathname) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      const accountId = requestUrl.searchParams.get("account_id");
      const provider = requestUrl.searchParams.get("provider");
      const errorType = requestUrl.searchParams.get("error_type");
      const errorTitle = requestUrl.searchParams.get("error_title");
      const errorDetail = requestUrl.searchParams.get("error_detail");

      if (errorType) {
        console.error("");
        console.error("UniPile returned an authentication error.");
        console.error(`Type: ${errorType}`);
        if (errorTitle) {
          console.error(`Title: ${errorTitle}`);
        }
        if (errorDetail) {
          console.error(`Detail: ${errorDetail}`);
        }

        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(renderHtml("WhatsApp link failed", "UniPile returned an authentication error. You can return to the terminal for details."));
        return;
      }

      console.log("");
      console.log(`${provider || "Account"} linked successfully.`);
      if (accountId) {
        console.log(`account_id: ${accountId}`);
      }

      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(renderHtml("WhatsApp linked", accountId ? `Your UniPile account_id is ${accountId}.` : "Your account was linked successfully."));
    });

    server.on("error", (error) => {
      reject(new Error(`Unable to start callback server on ${callbackUrl.host}: ${error.message}`));
    });

    server.listen(Number(callbackUrl.port || 80), callbackUrl.hostname, () => resolve(server));
  });
}

function renderHtml(title, message) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f6f7fb;
        color: #111827;
      }
      main {
        max-width: 40rem;
        margin: 10vh auto;
        padding: 2rem;
        background: #ffffff;
        border-radius: 1rem;
        box-shadow: 0 12px 40px rgba(17, 24, 39, 0.08);
      }
      h1 {
        margin-top: 0;
      }
      p {
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
    </main>
  </body>
</html>`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
