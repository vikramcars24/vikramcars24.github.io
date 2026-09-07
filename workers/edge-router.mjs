const defaultFallbackOrigin = "https://vikramcars24.github.io";
const defaultPrimaryTimeoutMs = 5_000;
const retryableMethods = new Set(["GET", "HEAD"]);

export async function routeWithFailover(request, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const fallbackOrigin = options.fallbackOrigin || defaultFallbackOrigin;
  const primaryTimeoutMs = normalizeTimeout(options.primaryTimeoutMs);
  const requestUrl = new URL(request.url);

  if (requestUrl.hostname === "www.vikramchopra.in") {
    requestUrl.hostname = "vikramchopra.in";
    return Response.redirect(requestUrl, 301);
  }

  let primaryResponse;
  let primaryError = options.forceFallback ? "authorized failover test" : "";

  if (!options.forceFallback) {
    try {
      primaryResponse = await fetchImpl(withTimeout(request, primaryTimeoutMs));
      if (!shouldFailOver(request, primaryResponse)) {
        return withOriginHeader(primaryResponse, "cloudflare-pages");
      }
    } catch (error) {
      primaryError = error instanceof Error ? error.message : String(error);
    }
  }

  if (!retryableMethods.has(request.method)) {
    return primaryResponse || unavailable(primaryError);
  }

  try {
    const fallbackRequest = requestForOrigin(request, fallbackOrigin);
    const fallbackResponse = await fetchImpl(withTimeout(fallbackRequest, primaryTimeoutMs));
    if (isUsableFallback(fallbackResponse, fallbackOrigin)) {
      if (primaryResponse?.body) await primaryResponse.body.cancel();
      console.log(JSON.stringify({
        message: "served fallback origin",
        method: request.method,
        path: requestUrl.pathname,
        primaryStatus: primaryResponse?.status || 0,
        primaryError
      }));
      return withOriginHeader(fallbackResponse, "github-pages-fallback");
    }
  } catch (error) {
    console.error(JSON.stringify({
      message: "fallback origin failed",
      method: request.method,
      path: requestUrl.pathname,
      error: error instanceof Error ? error.message : String(error)
    }));
  }

  return primaryResponse
    ? withOriginHeader(primaryResponse, "cloudflare-pages-error")
    : unavailable(primaryError);
}

function shouldFailOver(request, response) {
  return retryableMethods.has(request.method) && response.status >= 500;
}

function isUsableFallback(response, fallbackOrigin) {
  if (response.status >= 500) return false;
  const location = response.headers.get("location");
  if (!location) return true;

  try {
    const hostname = new URL(location, fallbackOrigin).hostname;
    return hostname === new URL(fallbackOrigin).hostname;
  } catch {
    return false;
  }
}

function requestForOrigin(request, origin) {
  const source = new URL(request.url);
  const target = new URL(source.pathname + source.search, origin);
  return new Request(target, request);
}

function withTimeout(request, timeoutMs) {
  return new Request(request, {
    signal: AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)])
  });
}

function withOriginHeader(response, origin) {
  const headers = new Headers(response.headers);
  headers.set("x-vikram-origin", origin);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function unavailable(detail) {
  console.error(JSON.stringify({ message: "both origins unavailable", detail }));
  return new Response("Site temporarily unavailable", {
    status: 503,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "retry-after": "30",
      "x-vikram-origin": "unavailable"
    }
  });
}

function normalizeTimeout(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed >= 500 && parsed <= 15_000
    ? parsed
    : defaultPrimaryTimeoutMs;
}

async function isAuthorizedFailoverTest(request, secret) {
  const candidate = request.headers.get("x-vikram-failover-test") || "";
  if (!secret || candidate.length !== secret.length) return false;
  const encoder = new TextEncoder();
  return crypto.subtle.timingSafeEqual(encoder.encode(candidate), encoder.encode(secret));
}

export default {
  async fetch(request, env) {
    return routeWithFailover(request, {
      fallbackOrigin: env.FALLBACK_ORIGIN,
      primaryTimeoutMs: env.PRIMARY_TIMEOUT_MS,
      forceFallback: await isAuthorizedFailoverTest(request, env.EDGE_FAILOVER_TEST_TOKEN)
    });
  }
};
