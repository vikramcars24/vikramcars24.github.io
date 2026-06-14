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
    files: [
      sitePath("tmp", "lighthouse-desktop.json"),
      sitePath("tmp", "lighthouse-desktop-retry.json")
    ],
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
    files: [sitePath("tmp", "lighthouse-mobile.json")],
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
    const samples = [];
    for (const file of audit.files) {
      try {
        samples.push(JSON.parse(await fs.readFile(file, "utf8")));
      } catch {
        // Ignore missing retry files and summarize the samples we do have.
      }
    }

    if (samples.length === 0) {
      throw new Error(`Missing Lighthouse output for ${audit.name}. Expected one of: ${audit.files.join(", ")}`);
    }

    const summary = summarizeAudit(samples, audit);
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

function summarizeAudit(samples, audit) {
  const metrics = samples.map((raw) => {
    const categories = raw.categories || {};
    const lighthouseAudits = raw.audits || {};
    return {
      performance: Number(categories.performance?.score || 0),
      fcpMs: Number(lighthouseAudits["first-contentful-paint"]?.numericValue || 0),
      lcpMs: Number(lighthouseAudits["largest-contentful-paint"]?.numericValue || 0),
      cls: Number(lighthouseAudits["cumulative-layout-shift"]?.numericValue || 0),
      tbtMs: Number(lighthouseAudits["total-blocking-time"]?.numericValue || 0)
    };
  });

  const performance = median(metrics.map((sample) => sample.performance));
  const fcpMs = median(metrics.map((sample) => sample.fcpMs));
  const lcpMs = median(metrics.map((sample) => sample.lcpMs));
  const cls = median(metrics.map((sample) => sample.cls));
  const tbtMs = median(metrics.map((sample) => sample.tbtMs));
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
    sampleCount: metrics.length,
    samples: metrics,
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
    lines.push(`- Samples: ${summary.sampleCount}`);
    lines.push(`- Performance: ${summary.performance.toFixed(2)}`);
    lines.push(`- FCP: ${formatMs(summary.fcpMs)}`);
    lines.push(`- LCP: ${formatMs(summary.lcpMs)}`);
    lines.push(`- CLS: ${summary.cls.toFixed(3)}`);
    lines.push(`- TBT: ${formatMs(summary.tbtMs)}`);
    if (summary.sampleCount > 1) {
      lines.push(`- Raw TBT samples: ${summary.samples.map((sample) => formatMs(sample.tbtMs)).join(", ")}`);
    }
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

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
