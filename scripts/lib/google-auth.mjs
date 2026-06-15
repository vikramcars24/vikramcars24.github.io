import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

const homeDir = os.homedir();
const defaultRegistryFile = path.join(homeDir, ".ai-ops", "google-auth", "profiles.json");
const legacyProfileFiles = {
  work: path.join(homeDir, "token.json"),
  personal: path.join(homeDir, "token_personal.json")
};

export const GOOGLE_SCOPE_SETS = {
  gmailOps: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.settings.basic"
  ],
  searchConsole: [
    "https://www.googleapis.com/auth/webmasters.readonly"
  ],
  workspaceCore: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/documents.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.settings.basic",
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/contacts.other.readonly"
  ]
};

export async function getGoogleAccessToken({
  profiles = [],
  requiredScopes = [],
  directAccessTokenEnv = "",
  oauthClientJsonEnv = "GOOGLE_OAUTH_CLIENT_JSON",
  oauthRefreshTokenEnv = "GOOGLE_OAUTH_REFRESH_TOKEN"
} = {}) {
  const directToken = directAccessTokenEnv ? (process.env[directAccessTokenEnv] || "").trim() : "";
  if (directToken) {
    return directToken;
  }

  const orderedProfiles = normalizeProfileList(profiles);
  for (const profileName of orderedProfiles) {
    const resolved = await refreshProfileAccessToken(profileName, requiredScopes);
    if (resolved.accessToken) {
      return resolved.accessToken;
    }
  }

  const refreshToken = (process.env[oauthRefreshTokenEnv] || "").trim();
  const clientJson = (process.env[oauthClientJsonEnv] || "").trim();
  if (!refreshToken || !clientJson) {
    return "";
  }

  const client = JSON.parse(clientJson);
  const source = client.installed || client.web || client;
  const payload = await exchangeRefreshToken({
    clientId: source.client_id,
    clientSecret: source.client_secret,
    refreshToken,
    tokenUri: source.token_uri
  });
  assertGrantedScopes(normalizeScopeList(payload.scope), requiredScopes, "environment OAuth token");
  return payload.access_token || "";
}

export async function inspectGoogleProfiles(profileNames = ["personal", "work"]) {
  const summaries = [];
  for (const profileName of normalizeProfileList(profileNames)) {
    const source = await resolveProfileSource(profileName);
    if (!source) {
      summaries.push({ profile: profileName, configured: false });
      continue;
    }

    const payload = await exchangeRefreshToken({
      clientId: source.clientId,
      clientSecret: source.clientSecret,
      refreshToken: source.refreshToken,
      tokenUri: source.tokenUri
    });

    const accessToken = payload.access_token || "";
    const grantedScopes = normalizeScopeList(payload.scope || source.scopes);
    let email = source.email || "";
    if (accessToken && grantedScopes.includes("https://www.googleapis.com/auth/gmail.readonly")) {
      try {
        const profile = await fetchJson("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        email = profile.emailAddress || email;
      } catch {
        // Keep the configured email if Gmail profile lookup is unavailable.
      }
    }

    summaries.push({
      profile: profileName,
      configured: true,
      email,
      tokenFile: source.tokenFile,
      scopes: grantedScopes
    });
  }

  return summaries;
}

async function refreshProfileAccessToken(profileName, requiredScopes) {
  const source = await resolveProfileSource(profileName);
  if (!source) {
    return { accessToken: "", scopes: [] };
  }

  const payload = await exchangeRefreshToken({
    clientId: source.clientId,
    clientSecret: source.clientSecret,
    refreshToken: source.refreshToken,
    tokenUri: source.tokenUri
  });
  const grantedScopes = normalizeScopeList(payload.scope || source.scopes);
  assertGrantedScopes(grantedScopes, requiredScopes, `${profileName} Google profile`);
  return { accessToken: payload.access_token || "", scopes: grantedScopes };
}

async function resolveProfileSource(profileName) {
  const registry = await loadRegistry();
  const configuredProfile = registry?.profiles?.[profileName];
  if (configuredProfile) {
    const tokenFile = configuredProfile.tokenFile;
    const clientFile = configuredProfile.clientFile || registry.oauthClientFile || path.join(homeDir, "credentials.json");
    const [tokenRaw, clientRaw] = await Promise.all([
      fs.readFile(tokenFile, "utf8"),
      fs.readFile(clientFile, "utf8")
    ]);
    const token = JSON.parse(tokenRaw);
    const client = JSON.parse(clientRaw);
    const source = client.installed || client.web || client;
    return {
      email: configuredProfile.email || "",
      scopes: normalizeScopeList(configuredProfile.scopes || token.scopes || []),
      tokenFile,
      clientFile,
      refreshToken: token.refresh_token,
      clientId: token.client_id || source.client_id,
      clientSecret: token.client_secret || source.client_secret,
      tokenUri: token.token_uri || source.token_uri || "https://oauth2.googleapis.com/token"
    };
  }

  const legacyFile = legacyProfileFiles[profileName];
  if (!legacyFile || !(await fileExists(legacyFile))) {
    return null;
  }

  const clientFile = path.join(homeDir, "credentials.json");
  if (!(await fileExists(clientFile))) {
    return null;
  }

  const [tokenRaw, clientRaw] = await Promise.all([
    fs.readFile(legacyFile, "utf8"),
    fs.readFile(clientFile, "utf8")
  ]);
  const token = JSON.parse(tokenRaw);
  const client = JSON.parse(clientRaw);
  const source = client.installed || client.web || client;
  return {
    email: "",
    scopes: normalizeScopeList(token.scopes || []),
    tokenFile: legacyFile,
    clientFile,
    refreshToken: token.refresh_token,
    clientId: token.client_id || source.client_id,
    clientSecret: token.client_secret || source.client_secret,
    tokenUri: token.token_uri || source.token_uri || "https://oauth2.googleapis.com/token"
  };
}

async function loadRegistry() {
  const registryFile = process.env.GOOGLE_AUTH_REGISTRY_FILE || defaultRegistryFile;
  if (!(await fileExists(registryFile))) {
    return null;
  }
  return JSON.parse(await fs.readFile(registryFile, "utf8"));
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function exchangeRefreshToken({ clientId, clientSecret, refreshToken, tokenUri }) {
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google auth profile is missing client_id, client_secret, or refresh_token.");
  }

  const response = await fetch(tokenUri || "https://oauth2.googleapis.com/token", {
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
  return payload;
}

function assertGrantedScopes(grantedScopes, requiredScopes, sourceLabel) {
  const required = normalizeScopeList(requiredScopes);
  if (required.length === 0) {
    return;
  }
  const missing = required.filter((scope) => !grantedScopes.includes(scope));
  if (missing.length > 0) {
    throw new Error(`${sourceLabel} is missing required Google scopes: ${missing.join(", ")}`);
  }
}

function normalizeProfileList(profiles) {
  return [...new Set((Array.isArray(profiles) ? profiles : [profiles]).filter(Boolean))];
}

function normalizeScopeList(scopes) {
  if (Array.isArray(scopes)) {
    return [...new Set(scopes.filter(Boolean))];
  }
  if (typeof scopes === "string") {
    return [...new Set(scopes.split(/\s+/).filter(Boolean))];
  }
  return [];
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || payload.error_description || payload.error || `Request failed: HTTP ${response.status}`);
  }
  return payload;
}
