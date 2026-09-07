import assert from "node:assert/strict";
import test from "node:test";
import { checkSite } from "./uptime-watchdog.mjs";

test("reports healthy only when every route matches", async () => {
  const report = await checkSite({ fetchImpl: healthyFetch, attempts: 1 });
  assert.equal(report.healthy, true);
  assert.equal(report.results.length, 6);
  assert.ok(report.results.every((result) => result.ok));
});

test("retries a transient failure once", async () => {
  let homepageCalls = 0;
  const report = await checkSite({
    attempts: 2,
    fetchImpl: async (url) => {
      if (url.pathname === "/" && homepageCalls++ === 0) {
        return response("temporary failure", "text/plain", 503);
      }
      return healthyFetch(url);
    }
  });

  assert.equal(report.healthy, true);
  assert.equal(report.results.find((result) => result.path === "/").attempt, 2);
});

test("reports a semantic homepage failure", async () => {
  const report = await checkSite({
    attempts: 1,
    fetchImpl: async (url) => url.pathname === "/"
      ? response("<title>Wrong site</title>", "text/html")
      : healthyFetch(url)
  });

  assert.equal(report.healthy, false);
  assert.match(report.results[0].error, /expected homepage title missing/);
});

function healthyFetch(url) {
  if (url.pathname.endsWith(".pdf")) return response("pdf", "application/pdf");
  if (url.pathname.endsWith(".xml")) return response("<xml />", "application/xml");
  return response("<title>Vikram Chopra</title>", "text/html; charset=utf-8");
}

function response(body, contentType, status = 200) {
  return new Response(body, { status, headers: { "content-type": contentType } });
}
