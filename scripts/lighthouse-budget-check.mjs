import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sitePath = (...parts) => path.join(rootDir, ...parts);
const reportPath = process.env.LIGHTHOUSE_REPORT_PATH
  ? path.resolve(process.env.LIGHTHOUSE_REPORT_PATH)
  : sitePath("tmp", "lighthouse-report.md");

const audits = [
  {
    name: "desktop",
    file: sitePath("tmp", "lighthouse-desktop.json"),
    thresholds: {
      performance: 0.75,
      fcpMs: 2500,
      lcpMs: 3500,
      cls: 0.1,
      tbtMs: 200
    }
  },
  {
    name: "mobile",
    file: sitePath("tmp", "lighthouse-mobile.json"),
    thresholds: {
      performance: 0.45,
      fcpMs: 4500,
      lcpMs: 4500,
      cls: 0.1,
      tbtMs: 1200
    }
  }
];

async function main() {
  const summaries = [];
  const failures = [];

  for (const audit of audits) {
    const raw = JSON.parse(await fs.readFile(audit.file, "utf8"));
    const summary = summarizeAudit(raw, audit);
    summaries.push(summary);
    failures.push(...summary.failures.map((failure) => `${audit.name}: ${failure}`));
  }

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, renderReport({ summaries, failures }), "utf8");

  if (failures.length > 0) {
    console.error(`Lighthouse budget check failed. Report written to ${reportPath}`);
    for (const failure of failures) {
      console.error(`ERROR: ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Lighthouse budgets passed for ${summaries.length} run(s).`);
  console.log(`Report written to ${reportPath}`);
}

function summarizeAudit(raw, audit) {
  const categories = raw.categories || {};
  const lighthouseAudits = raw.audits || {};
  const performance = Number(categories.performance?.score || 0);
  const fcpMs = Number(lighthouseAudits["first-contentful-paint"]?.numericValue || 0);
  const lcpMs = Number(lighthouseAudits["largest-contentful-paint"]?.numericValue || 0);
  const cls = Number(lighthouseAudits["cumulative-layout-shift"]?.numericValue || 0);
  const tbtMs = Number(lighthouseAudits["total-blocking-time"]?.numericValue || 0);
  const failures = [];

  if (performance < audit.thresholds.performance) {
    failures.push(`performance ${performance.toFixed(2)} below ${audit.thresholds.performance.toFixed(2)}`);
  }
  if (fcpMs > audit.thresholds.fcpMs) {
    failures.push(`FCP ${formatMs(fcpMs)} above ${formatMs(audit.thresholds.fcpMs)}`);
  }
  if (lcpMs > audit.thresholds.lcpMs) {
    failures.push(`LCP ${formatMs(lcpMs)} above ${formatMs(audit.thresholds.lcpMs)}`);
  }
  if (cls > audit.thresholds.cls) {
    failures.push(`CLS ${cls.toFixed(3)} above ${audit.thresholds.cls.toFixed(3)}`);
  }
  if (tbtMs > audit.thresholds.tbtMs) {
    failures.push(`TBT ${formatMs(tbtMs)} above ${formatMs(audit.thresholds.tbtMs)}`);
  }

  return {
    name: audit.name,
    performance,
    fcpMs,
    lcpMs,
    cls,
    tbtMs,
    failures
  };
}

function renderReport({ summaries, failures }) {
  const lines = [
    "# Lighthouse Budget Report",
    "",
    `- Generated: ${new Date().toISOString()}`,
    `- Runs: ${summaries.length}`,
    `- Failures: ${failures.length}`,
    ""
  ];

  if (failures.length > 0) {
    lines.push("## Failures", "");
    for (const failure of failures) {
      lines.push(`- ${failure}`);
    }
    lines.push("");
  }

  lines.push("## Metrics", "");
  for (const summary of summaries) {
    lines.push(`### ${capitalize(summary.name)}`);
    lines.push(`- Performance: ${summary.performance.toFixed(2)}`);
    lines.push(`- FCP: ${formatMs(summary.fcpMs)}`);
    lines.push(`- LCP: ${formatMs(summary.lcpMs)}`);
    lines.push(`- CLS: ${summary.cls.toFixed(3)}`);
    lines.push(`- TBT: ${formatMs(summary.tbtMs)}`);
    lines.push("");
  }

  return lines.join("\n");
}

function formatMs(value) {
  return `${(value / 1000).toFixed(1)}s`;
}

function capitalize(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
