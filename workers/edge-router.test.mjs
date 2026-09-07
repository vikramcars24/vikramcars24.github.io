import assert from "node:assert/strict";
import test from "node:test";
import { routeWithFailover } from "./edge-router.mjs";

test("streams a healthy primary response", async () => {
  const response = await routeWithFailover(request(), {
    fetchImpl: async () => html("primary")
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-vikram-origin"), "cloudflare-pages");
  assert.equal(await response.text(), "primary");
});

test("uses GitHub Pages after a primary 5xx", async () => {
  const seen = [];
  const response = await routeWithFailover(request("/archive/?a=1"), {
    fetchImpl: async (input) => {
      seen.push(new URL(input.url).hostname);
      return seen.length === 1 ? html("bad", 526) : html("fallback");
    }
  });

  assert.deepEqual(seen, ["vikramchopra.in", "vikramcars24.github.io"]);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-vikram-origin"), "github-pages-fallback");
  assert.equal(await response.text(), "fallback");
});

test("uses GitHub Pages after a primary fetch error", async () => {
  let calls = 0;
  const response = await routeWithFailover(request(), {
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) throw new Error("origin unavailable");
      return html("fallback");
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-vikram-origin"), "github-pages-fallback");
});

test("uses GitHub Pages for an authorized failure-injection check", async () => {
  const seen = [];
  const response = await routeWithFailover(request(), {
    forceFallback: true,
    fetchImpl: async (input) => {
      seen.push(new URL(input.url).hostname);
      return html("fallback");
    }
  });

  assert.deepEqual(seen, ["vikramcars24.github.io"]);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-vikram-origin"), "github-pages-fallback");
});

test("does not replay a non-idempotent request", async () => {
  let calls = 0;
  const response = await routeWithFailover(request("/submit", "POST"), {
    fetchImpl: async () => {
      calls += 1;
      return html("bad", 503);
    }
  });

  assert.equal(calls, 1);
  assert.equal(response.status, 503);
});

test("refuses a fallback redirect back to the primary domain", async () => {
  let calls = 0;
  const response = await routeWithFailover(request(), {
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return html("bad", 526);
      return new Response(null, {
        status: 301,
        headers: { location: "https://vikramchopra.in/" }
      });
    }
  });

  assert.equal(calls, 2);
  assert.equal(response.status, 526);
  assert.equal(response.headers.get("x-vikram-origin"), "cloudflare-pages-error");
});

test("redirects www to the canonical apex before fetching", async () => {
  let calls = 0;
  const response = await routeWithFailover(new Request("https://www.vikramchopra.in/archive/"), {
    fetchImpl: async () => {
      calls += 1;
      return html("unused");
    }
  });

  assert.equal(calls, 0);
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://vikramchopra.in/archive/");
});

function request(pathname = "/", method = "GET") {
  return new Request(`https://vikramchopra.in${pathname}`, { method });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}
