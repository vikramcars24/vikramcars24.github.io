const siteUrl = process.env.EDGE_ROUTER_URL || "https://vikramchopra.in/";
const fallbackUrl = process.env.EDGE_FALLBACK_URL || "https://vikramcars24.github.io/";
const testToken = process.env.EDGE_FAILOVER_TEST_TOKEN || "";

if (!testToken) {
  throw new Error("EDGE_FAILOVER_TEST_TOKEN is required.");
}

const primary = await fetch(siteUrl, { redirect: "manual", signal: AbortSignal.timeout(12_000) });
await assertResponse(primary, "cloudflare-pages", "primary route");

const failover = await fetch(siteUrl, {
  redirect: "manual",
  signal: AbortSignal.timeout(12_000),
  headers: { "x-vikram-failover-test": testToken }
});
await assertResponse(failover, "github-pages-fallback", "forced failover route");

const fallback = await fetch(fallbackUrl, { redirect: "manual", signal: AbortSignal.timeout(12_000) });
await assertResponse(fallback, "", "independent fallback");

console.log("Edge router verification passed: primary, forced failover, and independent fallback are healthy.");

async function assertResponse(response, expectedOrigin, label) {
  const body = await response.text();
  if (response.status !== 200) throw new Error(`${label}: expected HTTP 200, received ${response.status}`);
  if (!body.includes("<title>Vikram Chopra")) throw new Error(`${label}: homepage title missing`);
  if (expectedOrigin && response.headers.get("x-vikram-origin") !== expectedOrigin) {
    throw new Error(`${label}: expected ${expectedOrigin}, received ${response.headers.get("x-vikram-origin") || "no origin header"}`);
  }
}
