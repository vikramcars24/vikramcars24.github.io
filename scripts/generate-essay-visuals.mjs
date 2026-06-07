import { promises as fs } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rootDir = process.cwd();
const mediaDir = path.join(rootDir, "src", "media");

const sizes = {
  preview: { width: 1200, height: 630 },
  social: { width: 1003, height: 1568 },
  cover: { width: 1254, height: 1254 },
  blog: { width: 1672, height: 941 }
};

// Visual rule: every essay needs its own identity from scratch.
// Reuse palette infrastructure if helpful, but do not borrow an older essay's
// core motif or composition with only minor cosmetic changes.
// When essay visual work falls under the Cars24 Maker workflow, follow the
// cars24-maker-agent + creative-direction source files strictly.
const essays = [
  {
    slug: "the-coming-decade-of-car-ownership-in-india",
    title: "The Coming Decade of Car Ownership in India",
    titleLines: ["The coming", "decade of car", "ownership in India."],
    accentLineIndex: 2,
    subtitle: "Pre-owned. Transfer-heavy. Trust-led.",
    description: "The market grows when ownership feels survivable, then normal.",
    motif: "ownership-ledger",
    textMode: "architectural-light",
    backgroundMode: "signal-light",
    palette: {
      bgTop: "#F7F4FF",
      bgMid: "#EFEAFF",
      bgBottom: "#E7E1FF",
      glowPrimary: "#4736FE",
      glowSecondary: "#EF4523",
      titlePrimary: "#4736FE",
      titleAccent: "#4736FE",
      subtitle: "#4736FE",
      description: "#161616"
    }
  },
  {
    slug: "the-greenest-car-in-india-is-the-one-already-built",
    title: "The Greenest Car in India Is the One Already Built",
    titleLines: ["The greenest car", "in India is the", "one already built."],
    accentLineIndex: 2,
    subtitle: "Reuse works only when trust works.",
    description: "Battery legibility and transfer rails make climate real.",
    motif: "battery-passport",
    textMode: "architectural-light",
    backgroundMode: "maker-light",
    palette: {
      bgTop: "#F6F3FF",
      bgMid: "#F0ECFF",
      bgBottom: "#E7E1FF",
      glowPrimary: "#4736FE",
      glowSecondary: "#EF4523",
      titlePrimary: "#4736FE",
      titleAccent: "#6F5BFF",
      subtitle: "#4736FE",
      description: "#161616"
    }
  },
  {
    slug: "indias-road-deaths-trust-problem",
    title: "India's Road Deaths Are a Trust Problem",
    titleLines: ["India's road", "deaths are a", "trust problem."],
    accentLineIndex: 2,
    subtitle: "Not a traffic problem.",
    description: "Road safety fails when truth dies at each handoff.",
    motif: "forensic",
    textMode: "civic",
    backgroundMode: "maker-light",
    palette: {
      bgTop: "#EBE9FF",
      bgMid: "#F2F1FF",
      bgBottom: "#DFDBFF",
      glowPrimary: "#4736FE",
      glowSecondary: "#4736FE",
      titlePrimary: "#4736FE",
      titleAccent: "#4736FE",
      subtitle: "#4736FE",
      description: "#161616"
    }
  },
  {
    slug: "ai-native-is-not-ai-first",
    title: "AI-Native Is Not AI-First",
    titleLines: ["AI-Native", "is not", "AI-First."],
    accentLineIndex: 2,
    subtitle: "The org design is the AI strategy.",
    description: "What changes when the cost of carrying context collapses.",
    motif: "context-loom",
    textMode: "architectural-light",
    backgroundMode: "signal-light",
    palette: {
      bgTop: "#F3F1FF",
      bgMid: "#ECE8FF",
      bgBottom: "#E6E1FF",
      glowPrimary: "#4736FE",
      glowSecondary: "#EF4523",
      titlePrimary: "#4736FE",
      titleAccent: "#6F5BFF",
      subtitle: "#4736FE",
      description: "#161616"
    }
  },
  {
    slug: "builder-is-the-only-role-left",
    title: "Builder Is the Only Role Left",
    titleLines: ["Builder is", "the only role", "left."],
    accentLineIndex: 2,
    subtitle: "Prestige should move closer to the problem.",
    description: "The durable role is the one that closes loops directly.",
    motif: "builder-geometry",
    textMode: "architectural",
    backgroundMode: "maker-dark",
    palette: {
      bgTop: "#6356FF",
      bgMid: "#4736FE",
      bgBottom: "#2B1EB0",
      glowPrimary: "#FFFFFF",
      glowSecondary: "#EF4523",
      titlePrimary: "#FFFFFF",
      titleAccent: "#FFFFFF",
      subtitle: "#FFFFFF",
      description: "#FFFFFF"
    }
  },
  {
    slug: "the-car-is-the-artifact-trust-is-the-product",
    title: "The Car Is the Artifact. Trust Is the Product.",
    titleLines: ["The car is", "the artifact.", "Trust is the product."],
    accentLineIndex: 2,
    subtitle: "Certainty is what compounds in mobility.",
    description: "Ownership becomes a business when trust becomes a system.",
    motif: "trust-stack",
    textMode: "architectural",
    backgroundMode: "maker-dark",
    palette: {
      bgTop: "#5A4DFF",
      bgMid: "#4736FE",
      bgBottom: "#21167F",
      glowPrimary: "#FFFFFF",
      glowSecondary: "#EF4523",
      titlePrimary: "#FFFFFF",
      titleAccent: "#FFFFFF",
      subtitle: "#FFFFFF",
      description: "#FFFFFF"
    }
  },
  {
    slug: "scale-is-a-learning-problem",
    title: "Scale Is a Learning Problem",
    titleLines: ["Scale is a", "learning", "problem."],
    accentLineIndex: 1,
    subtitle: "Capability compounds when truth moves.",
    description: "The companies that grow wiser do not need to grow heavier.",
    motif: "learning-orbits",
    textMode: "architectural-light",
    eyebrow: "SYSTEMS / SCALE",
    titleScale: 0.9,
    titleOffsetY: 18,
    eyebrowOffsetY: -10,
    backgroundMode: "maker-light",
    palette: {
      bgTop: "#F6F2FF",
      bgMid: "#EEE9FF",
      bgBottom: "#E7E2FF",
      glowPrimary: "#4736FE",
      glowSecondary: "#EF4523",
      titlePrimary: "#4736FE",
      titleAccent: "#6B58FF",
      subtitle: "#4736FE",
      description: "#161616"
    }
  }
];

await fs.mkdir(mediaDir, { recursive: true });

for (const essay of essays) {
  for (const [variant, size] of Object.entries(sizes)) {
    const svg = renderEssayVisual({ essay, variant, ...size });
    const baseName = `${essay.slug}-${variant}`;
    const svgPath = path.join(mediaDir, `${baseName}.svg`);
    const pngPath = path.join(mediaDir, `${baseName}.png`);

    await fs.writeFile(svgPath, svg, "utf8");
    execFileSync("sips", ["-s", "format", "png", svgPath, "--out", pngPath], { stdio: "ignore" });
  }
}

console.log(`Generated essay visuals in ${mediaDir}`);

function renderEssayVisual({ essay, variant, width, height }) {
  const isTextVariant = variant !== "blog";
  const background = renderBackground(essay, width, height);
  const motif = essay.motif === "forensic"
    ? renderForensicCaseIllustration(essay, width, height, variant)
    : essay.motif === "context-loom"
      ? renderContextLoomMotif(essay, width, height, variant)
      : essay.motif === "ownership-ledger"
        ? renderOwnershipLedgerMotif(essay, width, height, variant)
        : essay.motif === "battery-passport"
          ? renderBatteryPassportMotif(essay, width, height, variant)
          : essay.motif === "builder-geometry"
            ? renderBuilderGeometryMotif(essay, width, height, variant)
            : essay.motif === "trust-stack"
              ? renderTrustStackMotif(essay, width, height, variant)
              : essay.motif === "learning-orbits"
                ? renderLearningOrbitMotif(essay, width, height, variant)
    : essay.motif === "context-grid"
      ? renderContextGridMotif(essay, width, height, variant)
      : renderAiMotif(essay, width, height, variant);
  const text = isTextVariant ? renderTextBlock(essay, width, height, variant) : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <linearGradient id="bgGradient" x1="0" y1="0" x2="${width}" y2="${height}">
      <stop offset="0%" stop-color="${essay.palette.bgTop}"/>
      <stop offset="42%" stop-color="${essay.palette.bgMid}"/>
      <stop offset="100%" stop-color="${essay.palette.bgBottom}"/>
    </linearGradient>
    <radialGradient id="violetGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${width * 0.08} ${height * 0.08}) rotate(40) scale(${width * 0.45} ${height * 0.52})">
      <stop offset="0%" stop-color="${essay.palette.glowPrimary}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${essay.palette.glowPrimary}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="emberGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${width * 0.84} ${height * 0.62}) rotate(210) scale(${width * 0.28} ${height * 0.38})">
      <stop offset="0%" stop-color="${essay.palette.glowSecondary}" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="${essay.palette.glowSecondary}" stop-opacity="0"/>
    </radialGradient>
    <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${Math.max(10, width * 0.008)}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="fineGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${Math.max(3, width * 0.0022)}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  ${background}
  ${motif}
  ${text}
</svg>`;
}

function renderBackground(essay, width, height) {
  if (essay.backgroundMode === "maker-light") {
    return renderMakerLightBackground(essay, width, height);
  }

  if (essay.backgroundMode === "signal-light") {
    return renderSignalLightBackground(essay, width, height);
  }

  if (essay.backgroundMode === "maker-dark") {
    return renderMakerDarkBackground(essay, width, height);
  }

  return `
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
  <rect width="${width}" height="${height}" fill="url(#violetGlow)" opacity="0.78"/>
  <rect width="${width}" height="${height}" fill="url(#emberGlow)" opacity="0.34"/>
  `;
}

function renderMakerLightBackground(essay, width, height) {
  return `
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
  <rect width="${width}" height="${height}" fill="url(#violetGlow)" opacity="0.08"/>
  <rect x="${width * 0.07}" y="${height * 0.08}" width="${width * 0.13}" height="${Math.max(8, height * 0.01)}" rx="${Math.max(2, height * 0.002)}" fill="rgba(239,69,35,0.9)"/>
  <rect x="${width * 0.79}" y="${height * 0.9}" width="${width * 0.12}" height="${Math.max(8, height * 0.01)}" rx="${Math.max(2, height * 0.002)}" fill="rgba(71,54,254,0.8)"/>
  `;
}

function renderSignalLightBackground(essay, width, height) {
  const cols = 10;
  const rows = 7;
  const lines = [];

  for (let i = 0; i <= cols; i += 1) {
    const x = width * 0.05 + (width * 0.9 * i) / cols;
    lines.push(`<line x1="${x}" y1="${height * 0.1}" x2="${x}" y2="${height * 0.9}" stroke="rgba(71,54,254,0.05)" stroke-width="${Math.max(1, width * 0.0008)}"/>`);
  }

  for (let i = 0; i <= rows; i += 1) {
    const y = height * 0.1 + (height * 0.8 * i) / rows;
    lines.push(`<line x1="${width * 0.05}" y1="${y}" x2="${width * 0.95}" y2="${y}" stroke="rgba(71,54,254,0.05)" stroke-width="${Math.max(1, width * 0.0008)}"/>`);
  }

  return `
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
  <rect width="${width}" height="${height}" fill="url(#violetGlow)" opacity="0.04"/>
  <ellipse cx="${width * 0.78}" cy="${height * 0.28}" rx="${width * 0.22}" ry="${height * 0.22}" fill="rgba(71,54,254,0.05)"/>
  <ellipse cx="${width * 0.18}" cy="${height * 0.82}" rx="${width * 0.18}" ry="${height * 0.18}" fill="rgba(239,69,35,0.035)"/>
  <g>${lines.join("\n")}</g>
  <rect x="${width * 0.072}" y="${height * 0.085}" width="${width * 0.11}" height="${Math.max(8, height * 0.009)}" rx="${Math.max(2, height * 0.002)}" fill="rgba(71,54,254,0.9)"/>
  <rect x="${width * 0.84}" y="${height * 0.885}" width="${width * 0.08}" height="${Math.max(8, height * 0.009)}" rx="${Math.max(2, height * 0.002)}" fill="rgba(239,69,35,0.82)"/>
  `;
}

function renderMakerDarkBackground(essay, width, height) {
  return `
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
  <rect width="${width}" height="${height}" fill="url(#violetGlow)" opacity="0.16"/>
  <rect width="${width}" height="${height}" fill="url(#emberGlow)" opacity="0.18"/>
  <ellipse cx="${width * 0.82}" cy="${height * 0.24}" rx="${width * 0.22}" ry="${height * 0.22}" fill="rgba(255,255,255,0.05)"/>
  <ellipse cx="${width * 0.14}" cy="${height * 0.8}" rx="${width * 0.18}" ry="${height * 0.2}" fill="rgba(239,69,35,0.08)"/>
  <rect x="${width * 0.072}" y="${height * 0.085}" width="${width * 0.11}" height="${Math.max(8, height * 0.009)}" rx="${Math.max(2, height * 0.002)}" fill="rgba(255,255,255,0.82)"/>
  <rect x="${width * 0.84}" y="${height * 0.885}" width="${width * 0.08}" height="${Math.max(8, height * 0.009)}" rx="${Math.max(2, height * 0.002)}" fill="rgba(239,69,35,0.82)"/>
  `;
}

function renderTextBlock(essay, width, height, variant) {
  if (essay.textMode === "civic") {
    return renderCivicTextBlock(essay, width, height, variant);
  }

  if (essay.textMode === "architectural") {
    return renderArchitecturalTextBlock(essay, width, height, variant);
  }

  if (essay.textMode === "architectural-light") {
    return renderArchitecturalLightTextBlock(essay, width, height, variant);
  }

  const isPreview = variant === "preview";
  const isSocial = variant === "social";
  const marginX = isPreview ? width * 0.065 : isSocial ? width * 0.07 : width * 0.075;
  const titleTop = isPreview ? height * 0.28 : isSocial ? height * 0.26 : height * 0.22;
  const lineGap = isPreview ? height * 0.18 : isSocial ? height * 0.095 : height * 0.115;
  const titleSize = isPreview ? width * 0.078 : isSocial ? width * 0.108 : width * 0.088;
  const subtitleY = titleTop + lineGap * (essay.titleLines.length + 0.35);
  const descY = subtitleY + (isPreview ? height * 0.09 : isSocial ? height * 0.065 : height * 0.078);
  const subtitleSize = isPreview ? width * 0.03 : isSocial ? width * 0.042 : width * 0.034;
  const descSize = isPreview ? width * 0.02 : isSocial ? width * 0.028 : width * 0.024;

  const titleLines = essay.titleLines
    .map((line, index) => {
      const y = titleTop + index * lineGap;
      const fill = index === essay.accentLineIndex ? essay.palette.titleAccent : essay.palette.titlePrimary;
      const fontStyle = index === essay.accentLineIndex ? "italic" : "normal";
      return `<text x="${marginX}" y="${y}" fill="${fill}" font-size="${titleSize}" font-family="Georgia, 'Times New Roman', serif" font-style="${fontStyle}" font-weight="400" letter-spacing="-0.03em">${escapeXml(line)}</text>`;
    })
    .join("\n");

  return `
  <g>
    ${titleLines}
    <text x="${marginX}" y="${subtitleY}" fill="${essay.palette.subtitle}" opacity="0.96" font-size="${subtitleSize}" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="600" letter-spacing="0.01em">${escapeXml(essay.subtitle)}</text>
    <text x="${marginX}" y="${descY}" fill="${essay.palette.description}" opacity="0.9" font-size="${descSize}" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="400">
      <tspan x="${marginX}" dy="0">${escapeXml(essay.description)}</tspan>
    </text>
  </g>`;
}

function renderCivicTextBlock(essay, width, height, variant) {
  const isPreview = variant === "preview";
  const isSocial = variant === "social";
  const marginX = isPreview ? width * 0.075 : isSocial ? width * 0.075 : width * 0.075;
  const titleTop = isPreview ? height * 0.27 : isSocial ? height * 0.17 : height * 0.2;
  const lineGap = isPreview ? height * 0.15 : isSocial ? height * 0.103 : height * 0.115;
  const titleSize = isPreview ? width * 0.072 : isSocial ? width * 0.094 : width * 0.082;
  const eyebrowY = isPreview ? height * 0.15 : isSocial ? height * 0.1 : height * 0.12;
  const subtitleY = titleTop + lineGap * (essay.titleLines.length + 0.2);
  const descY = subtitleY + (isPreview ? height * 0.082 : isSocial ? height * 0.07 : height * 0.078);
  const subtitleSize = isPreview ? width * 0.026 : isSocial ? width * 0.033 : width * 0.029;
  const descSize = isPreview ? width * 0.019 : isSocial ? width * 0.024 : width * 0.021;

  const titleLines = essay.titleLines
    .map((line, index) => {
      const y = titleTop + index * lineGap;
      const fill = index === essay.accentLineIndex ? essay.palette.titleAccent : essay.palette.titlePrimary;
      const weight = index === 0 ? "700" : index === 1 ? "300" : "800";
      const spacing = index === 1 ? "-0.045em" : "-0.055em";
      return `<text x="${marginX}" y="${y}" fill="${fill}" font-size="${titleSize}" font-family="Geist, 'Helvetica Neue', Arial, sans-serif" font-weight="${weight}" letter-spacing="${spacing}">${escapeXml(line)}</text>`;
    })
    .join("\n");

  return `
  <g>
    <text x="${marginX}" y="${eyebrowY}" fill="rgba(71,54,254,0.82)" font-size="${subtitleSize * 0.58}" font-family="Geist, 'Helvetica Neue', Arial, sans-serif" font-weight="700" letter-spacing="0.14em">ROAD SAFETY / INDIA</text>
    ${titleLines}
    <text x="${marginX}" y="${subtitleY}" fill="${essay.palette.subtitle}" opacity="0.96" font-size="${subtitleSize}" font-family="Geist, 'Helvetica Neue', Arial, sans-serif" font-weight="700" letter-spacing="-0.02em">${escapeXml(essay.subtitle)}</text>
    <text x="${marginX}" y="${descY}" fill="${essay.palette.description}" opacity="0.72" font-size="${descSize}" font-family="Geist, 'Helvetica Neue', Arial, sans-serif" font-weight="500">
      <tspan x="${marginX}" dy="0">${escapeXml(essay.description)}</tspan>
    </text>
  </g>`;
}

function renderArchitecturalTextBlock(essay, width, height, variant) {
  const isPreview = variant === "preview";
  const isSocial = variant === "social";
  const marginX = isPreview ? width * 0.065 : isSocial ? width * 0.075 : width * 0.072;
  const titleTop = isPreview ? height * 0.22 : isSocial ? height * 0.18 : height * 0.18;
  const lineGap = isPreview ? height * 0.17 : isSocial ? height * 0.088 : height * 0.108;
  const titleSize = isPreview ? width * 0.085 : isSocial ? width * 0.098 : width * 0.083;
  const subtitleY = titleTop + lineGap * (essay.titleLines.length + 0.32);
  const descY = subtitleY + (isPreview ? height * 0.1 : isSocial ? height * 0.07 : height * 0.084);
  const subtitleSize = isPreview ? width * 0.028 : isSocial ? width * 0.038 : width * 0.031;
  const descSize = isPreview ? width * 0.019 : isSocial ? width * 0.026 : width * 0.022;

  const titleLines = essay.titleLines
    .map((line, index) => {
      const y = titleTop + index * lineGap;
      const fill = index === essay.accentLineIndex ? essay.palette.titleAccent : essay.palette.titlePrimary;
      const weight = index === essay.accentLineIndex ? "600" : line === "is not" ? "300" : "500";
      const spacing = index === essay.accentLineIndex ? "-0.045em" : "-0.055em";
      const opacity = line === "is not" ? "0.92" : "1";
      return `<text x="${marginX}" y="${y}" fill="${fill}" opacity="${opacity}" font-size="${titleSize}" font-family="Geist, 'Helvetica Neue', Arial, sans-serif" font-weight="${weight}" letter-spacing="${spacing}">${escapeXml(line)}</text>`;
    })
    .join("\n");

  const bracketX = marginX - width * 0.02;
  const bracketTop = titleTop - height * 0.085;
  const bracketBottom = subtitleY + height * 0.03;
  const bracketWidth = width * 0.01;

  return `
  <g>
    <path d="M ${bracketX + bracketWidth} ${bracketTop} L ${bracketX} ${bracketTop} L ${bracketX} ${bracketBottom} L ${bracketX + bracketWidth} ${bracketBottom}"
          stroke="rgba(186,199,255,0.4)" stroke-width="${Math.max(1.2, width * 0.0015)}" fill="none"/>
    ${titleLines}
    <text x="${marginX}" y="${subtitleY}" fill="${essay.palette.subtitle}" opacity="0.96" font-size="${subtitleSize}" font-family="Geist, 'Helvetica Neue', Arial, sans-serif" font-weight="700" letter-spacing="-0.02em">${escapeXml(essay.subtitle)}</text>
    <text x="${marginX}" y="${descY}" fill="${essay.palette.description}" opacity="0.9" font-size="${descSize}" font-family="Geist, 'Helvetica Neue', Arial, sans-serif" font-weight="400">
      <tspan x="${marginX}" dy="0">${escapeXml(essay.description)}</tspan>
    </text>
  </g>`;
}

function renderArchitecturalLightTextBlock(essay, width, height, variant) {
  const isPreview = variant === "preview";
  const isSocial = variant === "social";
  const marginX = isPreview ? width * 0.072 : isSocial ? width * 0.08 : width * 0.074;
  const titleTop = isPreview ? height * 0.22 : isSocial ? height * 0.16 : height * 0.19;
  const lineGap = isPreview ? height * 0.17 : isSocial ? height * 0.088 : height * 0.108;
  const titleSize = isPreview ? width * 0.086 : isSocial ? width * 0.1 : width * 0.084;
  const eyebrowY = isPreview ? height * 0.13 : isSocial ? height * 0.1 : height * 0.12;
  const subtitleY = titleTop + lineGap * (essay.titleLines.length + 0.3);
  const descY = subtitleY + (isPreview ? height * 0.1 : isSocial ? height * 0.07 : height * 0.084);
  const subtitleSize = isPreview ? width * 0.03 : isSocial ? width * 0.038 : width * 0.032;
  const descSize = isPreview ? width * 0.019 : isSocial ? width * 0.025 : width * 0.022;
  const titleScale = essay.titleScale || 1;
  const titleOffsetY = essay.titleOffsetY || 0;
  const eyebrowOffsetY = essay.eyebrowOffsetY || 0;

  const titleLines = essay.titleLines
    .map((line, index) => {
      const y = titleTop + titleOffsetY + index * lineGap;
      const fill = index === essay.accentLineIndex ? essay.palette.titleAccent : essay.palette.titlePrimary;
      const weight = index === essay.accentLineIndex ? "700" : line === "is not" ? "300" : "500";
      const spacing = index === essay.accentLineIndex ? "-0.05em" : "-0.06em";
      return `<text x="${marginX}" y="${y}" fill="${fill}" font-size="${titleSize * titleScale}" font-family="Geist, 'Helvetica Neue', Arial, sans-serif" font-weight="${weight}" letter-spacing="${spacing}">${escapeXml(line)}</text>`;
    })
    .join("\n");

  return `
  <g>
    <text x="${marginX}" y="${eyebrowY + eyebrowOffsetY}" fill="rgba(71,54,254,0.72)" font-size="${subtitleSize * 0.54}" font-family="Geist, 'Helvetica Neue', Arial, sans-serif" font-weight="700" letter-spacing="0.12em">${escapeXml(essay.eyebrow || "ORG DESIGN / AI")}</text>
    ${titleLines}
    <text x="${marginX}" y="${subtitleY}" fill="${essay.palette.subtitle}" opacity="0.96" font-size="${subtitleSize}" font-family="Geist, 'Helvetica Neue', Arial, sans-serif" font-weight="700" letter-spacing="-0.02em">${escapeXml(essay.subtitle)}</text>
    <text x="${marginX}" y="${descY}" fill="${essay.palette.description}" opacity="0.76" font-size="${descSize}" font-family="Geist, 'Helvetica Neue', Arial, sans-serif" font-weight="500">
      <tspan x="${marginX}" dy="0">${escapeXml(essay.description)}</tspan>
    </text>
  </g>`;
}

function renderForensicCaseIllustration(essay, width, height, variant) {
  const isPreview = variant === "preview";
  const isSocial = variant === "social";
  const isBlog = variant === "blog";

  const sceneX = width * (isPreview ? 0.56 : isSocial ? 0.11 : isBlog ? 0.24 : 0.18);
  const sceneY = height * (isPreview ? 0.14 : isSocial ? 0.42 : isBlog ? 0.15 : 0.19);
  const sceneW = width * (isPreview ? 0.37 : isSocial ? 0.78 : isBlog ? 0.67 : 0.67);
  const sceneH = height * (isPreview ? 0.61 : isSocial ? 0.39 : isBlog ? 0.68 : 0.62);

  const grid = renderForensicGrid({
    x: sceneX - sceneW * 0.03,
    y: sceneY - sceneH * 0.03,
    w: sceneW * 0.99,
    h: sceneH * 1.02,
    cols: isBlog ? 7 : 6,
    rows: isBlog ? 5 : 4,
    stroke: "rgba(71,54,254,0.07)"
  });

  const particles = renderParticles({
    width,
    height,
    count: isBlog ? 50 : isSocial ? 62 : 38,
    region: [sceneX - sceneW * 0.04, sceneY - sceneH * 0.04, sceneW, sceneH],
    colors: ["rgba(71,54,254,0.03)", "rgba(71,54,254,0.05)"],
    seed: 141
  });

  const mainX = sceneX + sceneW * 0.04;
  const mainY = sceneY + sceneH * 0.08;
  const mainW = sceneW * 0.67;
  const mainH = sceneH * 0.78;
  const cardX = sceneX + sceneW * 0.68;
  const cardY = sceneY + sceneH * 0.22;
  const cardW = sceneW * 0.31;
  const cardH = sceneH * 0.31;
  const mapX = mainX + mainW * 0.08;
  const mapY = mainY + mainH * 0.5;
  const mapW = mainW * 0.34;
  const mapH = mainH * 0.27;
  const noteX = mainX + mainW * 0.52;
  const noteY = mainY + mainH * 0.57;
  const noteW = mainW * 0.3;
  const noteH = mainH * 0.18;

  const dossier = `
    <rect x="${mainX + sceneW * 0.014}" y="${mainY + sceneH * 0.014}" width="${mainW}" height="${mainH}" rx="${Math.max(10, width * 0.008)}" fill="rgba(71,54,254,0.05)"/>
    <rect x="${mainX}" y="${mainY}" width="${mainW}" height="${mainH}" rx="${Math.max(10, width * 0.008)}" fill="rgba(255,255,255,0.94)" stroke="rgba(71,54,254,0.2)" stroke-width="${Math.max(1.2, width * 0.0012)}"/>
    <rect x="${mainX + mainW * 0.06}" y="${mainY + mainH * 0.08}" width="${mainW * 0.19}" height="${mainH * 0.08}" rx="${mainH * 0.02}" fill="rgba(239,69,35,0.12)"/>
    <rect x="${mainX + mainW * 0.06}" y="${mainY + mainH * 0.2}" width="${mainW * 0.35}" height="${mainH * 0.03}" rx="${mainH * 0.01}" fill="rgba(22,22,22,0.12)"/>
    <rect x="${mainX + mainW * 0.06}" y="${mainY + mainH * 0.27}" width="${mainW * 0.53}" height="${mainH * 0.024}" rx="${mainH * 0.01}" fill="rgba(22,22,22,0.08)"/>
    <rect x="${mainX + mainW * 0.06}" y="${mainY + mainH * 0.32}" width="${mainW * 0.44}" height="${mainH * 0.024}" rx="${mainH * 0.01}" fill="rgba(22,22,22,0.06)"/>
    <line x1="${mainX + mainW * 0.06}" y1="${mainY + mainH * 0.41}" x2="${mainX + mainW * 0.94}" y2="${mainY + mainH * 0.41}" stroke="rgba(71,54,254,0.12)" stroke-width="${Math.max(1, width * 0.001)}"/>
    <line x1="${mainX + mainW * 0.48}" y1="${mainY + mainH * 0.49}" x2="${mainX + mainW * 0.48}" y2="${mainY + mainH * 0.86}" stroke="rgba(71,54,254,0.12)" stroke-width="${Math.max(1, width * 0.001)}"/>
  `;

  const mapInset = `
    <rect x="${mapX}" y="${mapY}" width="${mapW}" height="${mapH}" rx="${Math.max(8, width * 0.006)}" fill="rgba(71,54,254,0.04)" stroke="rgba(71,54,254,0.16)" stroke-width="${Math.max(1, width * 0.001)}"/>
    <path d="M ${mapX + mapW * 0.12} ${mapY + mapH * 0.22} L ${mapX + mapW * 0.84} ${mapY + mapH * 0.22}" stroke="rgba(71,54,254,0.26)" stroke-width="${Math.max(2, width * 0.0018)}"/>
    <path d="M ${mapX + mapW * 0.18} ${mapY + mapH * 0.1} L ${mapX + mapW * 0.18} ${mapY + mapH * 0.88}" stroke="rgba(71,54,254,0.22)" stroke-width="${Math.max(2, width * 0.0018)}"/>
    <path d="M ${mapX + mapW * 0.12} ${mapY + mapH * 0.7} L ${mapX + mapW * 0.86} ${mapY + mapH * 0.44}" stroke="rgba(71,54,254,0.18)" stroke-width="${Math.max(2, width * 0.0016)}"/>
    <circle cx="${mapX + mapW * 0.56}" cy="${mapY + mapH * 0.42}" r="${Math.max(6, width * 0.0044)}" fill="rgba(239,69,35,0.9)"/>
    <circle cx="${mapX + mapW * 0.56}" cy="${mapY + mapH * 0.42}" r="${Math.max(11, width * 0.008)}" fill="none" stroke="rgba(239,69,35,0.3)" stroke-width="${Math.max(1.2, width * 0.0011)}"/>
  `;

  const notePanel = `
    <rect x="${noteX}" y="${noteY}" width="${noteW}" height="${noteH}" rx="${Math.max(8, width * 0.006)}" fill="rgba(255,255,255,0.88)" stroke="rgba(71,54,254,0.14)" stroke-width="${Math.max(1, width * 0.001)}"/>
    <rect x="${noteX + noteW * 0.12}" y="${noteY + noteH * 0.18}" width="${noteW * 0.46}" height="${noteH * 0.12}" rx="${noteH * 0.04}" fill="rgba(22,22,22,0.1)"/>
    <rect x="${noteX + noteW * 0.12}" y="${noteY + noteH * 0.42}" width="${noteW * 0.58}" height="${noteH * 0.09}" rx="${noteH * 0.04}" fill="rgba(22,22,22,0.07)"/>
    <rect x="${noteX + noteW * 0.12}" y="${noteY + noteH * 0.62}" width="${noteW * 0.32}" height="${noteH * 0.08}" rx="${noteH * 0.04}" fill="rgba(239,69,35,0.18)"/>
  `;

  const fieldCard = `
    <g transform="rotate(-4 ${cardX + cardW * 0.5} ${cardY + cardH * 0.5})">
      <rect x="${cardX + sceneW * 0.014}" y="${cardY + sceneH * 0.016}" width="${cardW}" height="${cardH}" rx="${Math.max(10, width * 0.006)}" fill="rgba(71,54,254,0.05)"/>
      <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${Math.max(10, width * 0.006)}" fill="rgba(255,255,255,0.94)" stroke="rgba(71,54,254,0.2)" stroke-width="${Math.max(1, width * 0.001)}"/>
      <rect x="${cardX + cardW * 0.14}" y="${cardY + cardH * 0.19}" width="${cardW * 0.42}" height="${cardH * 0.08}" rx="${cardH * 0.03}" fill="rgba(22,22,22,0.09)"/>
      <rect x="${cardX + cardW * 0.14}" y="${cardY + cardH * 0.34}" width="${cardW * 0.56}" height="${cardH * 0.06}" rx="${cardH * 0.025}" fill="rgba(22,22,22,0.06)"/>
      <rect x="${cardX + cardW * 0.14}" y="${cardY + cardH * 0.46}" width="${cardW * 0.36}" height="${cardH * 0.06}" rx="${cardH * 0.025}" fill="rgba(22,22,22,0.05)"/>
      <rect x="${cardX + cardW * 0.14}" y="${cardY + cardH * 0.63}" width="${cardW * 0.16}" height="${cardW * 0.16}" rx="${cardW * 0.035}" fill="rgba(71,54,254,0.08)" stroke="rgba(71,54,254,0.38)" stroke-width="${Math.max(1, width * 0.0012)}"/>
      <rect x="${cardX + cardW * 0.205}" y="${cardY + cardH * 0.69}" width="${cardW * 0.03}" height="${cardW * 0.07}" rx="${cardW * 0.01}" fill="rgba(71,54,254,0.9)"/>
      <rect x="${cardX + cardW * 0.185}" y="${cardY + cardH * 0.71}" width="${cardW * 0.07}" height="${cardW * 0.03}" rx="${cardW * 0.01}" fill="rgba(71,54,254,0.9)"/>
      <path d="M ${cardX + cardW * 0.62} ${cardY + cardH * 0.68} L ${cardX + cardW * 0.8} ${cardY + cardH * 0.68}" stroke="rgba(71,54,254,0.24)" stroke-width="${Math.max(2, width * 0.0016)}"/>
      <path d="M ${cardX + cardW * 0.71} ${cardY + cardH * 0.58} L ${cardX + cardW * 0.71} ${cardY + cardH * 0.78}" stroke="rgba(71,54,254,0.24)" stroke-width="${Math.max(2, width * 0.0016)}"/>
      <circle cx="${cardX + cardW * 0.71}" cy="${cardY + cardH * 0.68}" r="${Math.max(4, width * 0.0032)}" fill="rgba(239,69,35,0.92)"/>
    </g>
  `;

  const markers = `
    ${renderEvidenceMarker({
      number: "01",
      cx: mainX + mainW * 0.78,
      cy: mainY + mainH * 0.29,
      endX: cardX + cardW * 0.2,
      endY: cardY + cardH * 0.2
    })}
    ${renderEvidenceMarker({
      number: "02",
      cx: mainX + mainW * 0.41,
      cy: mainY + mainH * 0.83,
      endX: mapX + mapW * 0.56,
      endY: mapY + mapH * 0.42
    })}
    ${renderEvidenceMarker({
      number: "03",
      cx: mainX + mainW * 0.84,
      cy: mainY + mainH * 0.72,
      endX: noteX + noteW * 0.24,
      endY: noteY + noteH * 0.62
    })}
  `;

  return `
  <g>
    ${grid}
    ${particles}
    ${dossier}
    ${mapInset}
    ${notePanel}
    ${fieldCard}
    ${markers}
  </g>`;
}

function renderForensicGrid({ x, y, w, h, cols, rows, stroke }) {
  const lines = [];
  for (let i = 0; i <= cols; i += 1) {
    const lineX = x + (w / cols) * i;
    lines.push(`<line x1="${lineX}" y1="${y}" x2="${lineX}" y2="${y + h}" stroke="${stroke}" stroke-width="1"/>`);
  }
  for (let j = 0; j <= rows; j += 1) {
    const lineY = y + (h / rows) * j;
    lines.push(`<line x1="${x}" y1="${lineY}" x2="${x + w}" y2="${lineY}" stroke="${stroke}" stroke-width="1"/>`);
  }
  return `<g opacity="0.74">${lines.join("\n")}</g>`;
}

function renderEvidenceMarker({ number, cx, cy, endX, endY }) {
  const elbowX = cx < endX ? cx + (endX - cx) * 0.45 : cx - (cx - endX) * 0.45;
  return `
    <g>
      <path d="M ${cx} ${cy} L ${elbowX} ${cy} L ${elbowX} ${endY} L ${endX} ${endY}"
            stroke="rgba(71,54,254,0.32)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="${cx}" cy="${cy}" r="11" fill="rgba(239,69,35,0.92)"/>
      <text x="${cx}" y="${cy + 4}" fill="#FFFFFF" text-anchor="middle" font-size="9" font-family="Geist, 'Helvetica Neue', Arial, sans-serif" font-weight="700" letter-spacing="0.04em">${number}</text>
    </g>
  `;
}

function renderAiMotif(essay, width, height, variant) {
  const isPreview = variant === "preview";
  const baseX = width * (isPreview ? 0.63 : variant === "social" ? 0.69 : 0.64);
  const baseY = height * (isPreview ? 0.2 : variant === "social" ? 0.28 : 0.23);
  const panelW = width * (variant === "blog" ? 0.26 : isPreview ? 0.17 : 0.2);
  const panelH = height * (variant === "blog" ? 0.16 : isPreview ? 0.24 : 0.14);

  const panels = [];
  for (let i = 0; i < 5; i += 1) {
    const x = baseX + i * width * 0.04;
    const y = baseY + i * height * (isPreview ? 0.11 : 0.075);
    const opacity = 0.08 + i * 0.035;
    panels.push(`<rect x="${x}" y="${y}" width="${panelW}" height="${panelH}" rx="${width * 0.012}" fill="rgba(110,132,255,${opacity})" stroke="rgba(185,205,255,${0.2 + i * 0.03})" stroke-width="${Math.max(1, width * 0.0011)}"/>`);
  }

  const flows = [];
  for (let i = 0; i < (isPreview ? 10 : 16); i += 1) {
    const startY = height * ((isPreview ? 0.28 : 0.18) + i * (isPreview ? 0.05 : 0.034));
    const endY = height * ((isPreview ? 0.28 : 0.2) + i * (isPreview ? 0.04 : 0.028));
    const ctrl1X = width * (isPreview ? 0.5 : 0.42);
    const ctrl2X = baseX + panelW * 0.15;
    const color = i % 4 === 0 ? "rgba(255,161,97,0.42)" : "rgba(192,213,255,0.5)";
    flows.push(`<path d="M ${width * 0.5} ${startY} C ${ctrl1X} ${startY}, ${ctrl2X} ${endY}, ${width * 0.98} ${endY + (i % 3 - 1) * height * 0.004}" stroke="${color}" stroke-width="${Math.max(1.1, width * 0.0012)}" stroke-linecap="round" fill="none" filter="url(#fineGlow)"/>`);
  }

  const spine = [];
  for (let i = 0; i < 6; i += 1) {
    const x = baseX + i * width * 0.046 - width * 0.018;
    spine.push(`<line x1="${x}" y1="${baseY - height * 0.04}" x2="${x}" y2="${baseY + panelH + height * 0.42}" stroke="rgba(112,150,255,0.08)" stroke-width="${Math.max(1, width * 0.0009)}"/>`);
  }

  const particles = renderParticles({
    width,
    height,
    count: variant === "blog" ? 140 : isPreview ? 110 : 200,
    region: [baseX - width * 0.03, baseY - height * 0.05, width * 0.34, height * 0.64],
    colors: ["rgba(197,214,255,0.8)", "rgba(255,161,97,0.58)", "rgba(112,150,255,0.54)"],
    seed: 33
  });

  return `
  <g>
    ${spine.join("\n")}
    ${panels.join("\n")}
    <path d="M ${baseX - width * 0.035} ${baseY + panelH * 0.45}
             C ${baseX + panelW * 0.08} ${baseY + panelH * 0.32}, ${baseX + panelW * 0.54} ${baseY + panelH * 0.25}, ${baseX + panelW * 0.98} ${baseY + panelH * 0.18}
             C ${baseX + panelW * 1.24} ${baseY + panelH * 0.14}, ${baseX + panelW * 1.45} ${baseY + panelH * 0.2}, ${baseX + panelW * 1.58} ${baseY + panelH * 0.24}"
          stroke="rgba(255,242,232,0.72)" stroke-width="${Math.max(2.5, width * 0.0025)}" stroke-linecap="round" fill="none" filter="url(#softGlow)"/>
    ${flows.join("\n")}
    ${particles}
  </g>`;
}

function renderContextGridMotif(essay, width, height, variant) {
  const isPreview = variant === "preview";
  const isSocial = variant === "social";
  const isBlog = variant === "blog";
  const clusterX = width * (isPreview ? 0.61 : isSocial ? 0.54 : isBlog ? 0.44 : 0.58);
  const clusterY = height * (isPreview ? 0.19 : isSocial ? 0.36 : isBlog ? 0.21 : 0.22);
  const clusterW = width * (isPreview ? 0.28 : isSocial ? 0.34 : isBlog ? 0.42 : 0.31);
  const clusterH = height * (isPreview ? 0.5 : isSocial ? 0.42 : isBlog ? 0.5 : 0.5);

  const modules = [];
  const moduleSpecs = [
    [0.02, 0.04, 0.44, 0.22, "0.56"],
    [0.34, 0.16, 0.46, 0.22, "0.66"],
    [0.1, 0.42, 0.42, 0.24, "0.74"],
    [0.48, 0.5, 0.38, 0.18, "0.82"],
    [0.28, 0.72, 0.48, 0.18, "0.9"]
  ];
  for (const [mx, my, mw, mh, op] of moduleSpecs) {
    modules.push(`
      <rect x="${clusterX + clusterW * mx}" y="${clusterY + clusterH * my}" width="${clusterW * mw}" height="${clusterH * mh}"
            rx="${Math.max(12, width * 0.012)}"
            fill="rgba(255,255,255,${op})"
            stroke="rgba(71,54,254,0.16)"
            stroke-width="${Math.max(1.2, width * 0.0011)}"/>
    `);
  }

  const rails = [];
  const railCount = isBlog ? 8 : 6;
  for (let i = 0; i < railCount; i += 1) {
    const y = clusterY + clusterH * (0.08 + i * 0.13);
    rails.push(`<path d="M ${clusterX - clusterW * 0.14} ${y} C ${clusterX + clusterW * 0.05} ${y - height * 0.012}, ${clusterX + clusterW * 0.28} ${y + height * 0.012}, ${clusterX + clusterW * 0.94} ${y}"
      stroke="${i % 3 === 0 ? "rgba(239,69,35,0.32)" : "rgba(71,54,254,0.28)"}"
      stroke-width="${Math.max(1.4, width * 0.00135)}" fill="none" stroke-linecap="round"/>`);
  }

  const connectors = [];
  const points = [
    [0.24, 0.15],
    [0.57, 0.27],
    [0.31, 0.54],
    [0.67, 0.59],
    [0.46, 0.81]
  ];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x1f, y1f] = points[i];
    const [x2f, y2f] = points[i + 1];
    const x1 = clusterX + clusterW * x1f;
    const y1 = clusterY + clusterH * y1f;
    const x2 = clusterX + clusterW * x2f;
    const y2 = clusterY + clusterH * y2f;
    connectors.push(`<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="rgba(71,54,254,0.18)" stroke-width="${Math.max(1.3, width * 0.0012)}" stroke-dasharray="${Math.max(6, width * 0.004)} ${Math.max(8, width * 0.006)}" fill="none"/>`);
    connectors.push(`<circle cx="${x1}" cy="${y1}" r="${Math.max(3.5, width * 0.0028)}" fill="${i % 2 === 0 ? "rgba(239,69,35,0.86)" : "rgba(71,54,254,0.86)"}"/>`);
    if (i === points.length - 2) {
      connectors.push(`<circle cx="${x2}" cy="${y2}" r="${Math.max(3.5, width * 0.0028)}" fill="rgba(71,54,254,0.86)"/>`);
    }
  }

  const labels = [];
  const labelCount = isSocial ? 7 : 5;
  for (let i = 0; i < labelCount; i += 1) {
    const lx = clusterX + clusterW * (0.04 + (i % 3) * 0.28);
    const ly = clusterY + clusterH * (0.01 + Math.floor(i / 3) * 0.34);
    labels.push(`<rect x="${lx}" y="${ly}" width="${clusterW * 0.12}" height="${clusterH * 0.045}" rx="${clusterH * 0.012}" fill="${i % 2 === 0 ? "rgba(71,54,254,0.1)" : "rgba(239,69,35,0.1)"}"/>`);
  }

  const particles = renderParticles({
    width,
    height,
    count: isBlog ? 40 : isPreview ? 26 : 32,
    region: [clusterX - clusterW * 0.08, clusterY - clusterH * 0.05, clusterW * 1.08, clusterH * 1.04],
    colors: ["rgba(71,54,254,0.22)", "rgba(239,69,35,0.22)", "rgba(71,54,254,0.12)"],
    seed: 121
  });

  return `
  <g>
    ${rails.join("\n")}
    ${modules.join("\n")}
    ${labels.join("\n")}
    ${connectors.join("\n")}
    ${particles}
  </g>`;
}

function renderContextLoomMotif(essay, width, height, variant) {
  const isPreview = variant === "preview";
  const isSocial = variant === "social";
  const isBlog = variant === "blog";
  const frameX = width * (isPreview ? 0.54 : isSocial ? 0.08 : isBlog ? 0.05 : 0.1);
  const frameY = height * (isPreview ? 0.16 : isSocial ? 0.4 : isBlog ? 0.1 : 0.14);
  const frameW = width * (isPreview ? 0.38 : isSocial ? 0.84 : isBlog ? 0.88 : 0.8);
  const frameH = height * (isPreview ? 0.58 : isSocial ? 0.42 : isBlog ? 0.8 : 0.7);

  const inputCount = isBlog ? 5 : 4;
  const outputCount = 3;
  const inputs = Array.from({ length: inputCount }, (_, index) => frameY + frameH * (0.08 + index * (isBlog ? 0.16 : 0.2)));
  const routers = [0.22, 0.5, 0.78].map((ratio) => frameY + frameH * ratio);
  const outputs = [0.22, 0.5, 0.78].map((ratio) => frameY + frameH * ratio);

  const leftX = frameX + frameW * 0.04;
  const rightX = frameX + frameW * 0.68;
  const spineX = frameX + frameW * 0.5;
  const leftCardW = frameW * (isBlog ? 0.2 : 0.24);
  const rightCardW = frameW * (isBlog ? 0.22 : 0.24);
  const leftCardH = frameH * (isBlog ? 0.12 : 0.14);
  const rightCardH = frameH * (isBlog ? 0.14 : 0.16);

  const gridLines = [];
  const columnCount = isBlog ? 8 : 6;
  const rowCount = isBlog ? 6 : 5;
  for (let i = 0; i <= columnCount; i += 1) {
    const x = frameX + (frameW * i) / columnCount;
    gridLines.push(`<line x1="${x}" y1="${frameY}" x2="${x}" y2="${frameY + frameH}" stroke="rgba(71,54,254,0.06)" stroke-width="${Math.max(1, width * 0.0009)}"/>`);
  }
  for (let i = 0; i <= rowCount; i += 1) {
    const y = frameY + (frameH * i) / rowCount;
    gridLines.push(`<line x1="${frameX}" y1="${y}" x2="${frameX + frameW}" y2="${y}" stroke="rgba(71,54,254,0.07)" stroke-width="${Math.max(1, width * 0.0009)}"/>`);
  }

  const frame = `
    <rect x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}" rx="${Math.max(20, width * 0.012)}" fill="rgba(255,255,255,0.28)" stroke="rgba(71,54,254,0.09)" stroke-width="${Math.max(1.2, width * 0.001)}"/>
    <ellipse cx="${frameX + frameW * 0.86}" cy="${frameY + frameH * 0.16}" rx="${frameW * 0.22}" ry="${frameH * 0.25}" fill="rgba(71,54,254,0.05)"/>
    <ellipse cx="${frameX + frameW * 0.08}" cy="${frameY + frameH * 0.9}" rx="${frameW * 0.2}" ry="${frameH * 0.22}" fill="rgba(239,69,35,0.04)"/>
    ${gridLines.join("\n")}
    <line x1="${spineX}" y1="${frameY + frameH * 0.1}" x2="${spineX}" y2="${frameY + frameH * 0.84}" stroke="rgba(71,54,254,0.24)" stroke-width="${Math.max(2.6, width * 0.0018)}"/>
  `;

  const inputCards = inputs
    .map((y, index) => renderSignalCard({
      x: leftX,
      y,
      w: leftCardW,
      h: leftCardH,
      accent: index % 2 === 0 ? "cool" : "warm"
    }))
    .join("");

  const outputCards = outputs
    .map((y, index) => renderSignalCard({
      x: rightX,
      y: y - rightCardH / 2,
      w: rightCardW,
      h: rightCardH,
      accent: index === 1 ? "warm" : "cool"
    }))
    .join("");

  const flows = [];
  inputs.forEach((y, index) => {
    const sourceX = leftX + leftCardW;
    const sourceY = y + leftCardH * 0.5;
    const targetY = routers[index % routers.length];
    flows.push(`<path d="M ${sourceX} ${sourceY} C ${frameX + frameW * 0.34} ${sourceY}, ${frameX + frameW * 0.42} ${targetY}, ${spineX - frameW * 0.02} ${targetY}"
      stroke="${index % 2 === 0 ? "rgba(71,54,254,0.52)" : "rgba(239,69,35,0.46)"}"
      stroke-width="${Math.max(2.4, width * 0.0016)}" fill="none" stroke-linecap="round"/>`);
  });

  outputs.forEach((y, index) => {
    const sourceY = routers[index];
    const endX = rightX;
    const endY = y;
    flows.push(`<path d="M ${spineX + frameW * 0.02} ${sourceY} C ${frameX + frameW * 0.58} ${sourceY}, ${frameX + frameW * 0.61} ${endY}, ${endX} ${endY}"
      stroke="${index === 1 ? "rgba(239,69,35,0.48)" : "rgba(71,54,254,0.52)"}"
      stroke-width="${Math.max(2.6, width * 0.0017)}" fill="none" stroke-linecap="round"/>`);
  });

  if (isBlog) {
    flows.push(`<path d="M ${leftX + leftCardW * 0.98} ${inputs[2] + leftCardH * 0.52} C ${frameX + frameW * 0.36} ${inputs[2] + leftCardH * 0.52}, ${frameX + frameW * 0.41} ${routers[2]}, ${spineX - frameW * 0.02} ${routers[2]}"
      stroke="rgba(71,54,254,0.46)" stroke-width="${Math.max(2.4, width * 0.0016)}" fill="none" stroke-linecap="round"/>`);
  }

  const nodes = routers
    .map((y, index) => `
      <g filter="url(#fineGlow)">
        <circle cx="${spineX}" cy="${y}" r="${Math.max(18, width * 0.011)}" fill="rgba(255,255,255,0.96)" stroke="rgba(71,54,254,0.24)" stroke-width="${Math.max(1.5, width * 0.0012)}"/>
        <circle cx="${spineX}" cy="${y}" r="${Math.max(6, width * 0.0036)}" fill="${index === 1 ? "rgba(239,69,35,0.96)" : "rgba(71,54,254,0.96)"}"/>
      </g>
    `)
    .join("");

  const particles = renderParticles({
    width,
    height,
    count: isBlog ? 42 : isPreview ? 26 : 34,
    region: [frameX, frameY, frameW, frameH],
    colors: ["rgba(71,54,254,0.16)", "rgba(239,69,35,0.16)", "rgba(71,54,254,0.08)"],
    seed: 241
  });

  return `
  <g>
    ${frame}
    ${inputCards}
    ${outputCards}
    ${flows.join("\n")}
    ${nodes}
    ${particles}
  </g>`;
}

function renderOwnershipLedgerMotif(essay, width, height, variant) {
  const isPreview = variant === "preview";
  const isSocial = variant === "social";
  const boardX = width * (isPreview ? 0.55 : isSocial ? 0.08 : 0.08);
  const boardY = height * (isPreview ? 0.18 : isSocial ? 0.42 : 0.12);
  const boardW = width * (isPreview ? 0.34 : isSocial ? 0.84 : 0.82);
  const boardH = height * (isPreview ? 0.56 : isSocial ? 0.38 : 0.72);
  const rows = isSocial ? 4 : 5;
  const cards = [];
  const lines = [];
  const dots = [];

  for (let i = 0; i < rows; i += 1) {
    const y = boardY + boardH * (0.08 + i * (0.78 / rows));
    const w = boardW * (0.58 + (i % 2) * 0.12);
    const h = boardH * 0.12;
    cards.push(`
      <rect x="${boardX + boardW * 0.08}" y="${y}" width="${w}" height="${h}" rx="${Math.max(14, width * 0.01)}"
            fill="rgba(255,255,255,0.95)" stroke="rgba(71,54,254,0.16)" stroke-width="${Math.max(1.2, width * 0.001)}"/>
      <rect x="${boardX + boardW * 0.12}" y="${y + h * 0.22}" width="${w * 0.22}" height="${h * 0.14}" rx="${h * 0.04}" fill="rgba(71,54,254,0.14)"/>
      <rect x="${boardX + boardW * 0.12}" y="${y + h * 0.5}" width="${w * 0.42}" height="${h * 0.1}" rx="${h * 0.04}" fill="rgba(22,22,22,0.08)"/>
      <circle cx="${boardX + boardW * 0.84}" cy="${y + h * 0.5}" r="${Math.max(8, width * 0.005)}" fill="${i % 2 === 0 ? "rgba(71,54,254,0.88)" : "rgba(239,69,35,0.88)"}"/>
    `);
    if (i < rows - 1) {
      const x1 = boardX + boardW * 0.84;
      const y1 = y + h * 0.5;
      const x2 = boardX + boardW * 0.84;
      const y2 = boardY + boardH * (0.08 + (i + 1) * (0.78 / rows)) + h * 0.5;
      lines.push(`<path d="M ${x1} ${y1} C ${x1 + boardW * 0.08} ${y1}, ${x2 + boardW * 0.08} ${y2}, ${x2} ${y2}" stroke="rgba(71,54,254,0.26)" stroke-width="${Math.max(2, width * 0.0015)}" fill="none" stroke-dasharray="${Math.max(6, width * 0.004)} ${Math.max(8, width * 0.006)}"/>`);
    }
  }

  for (let i = 0; i < 18; i += 1) {
    const x = boardX + boardW * (0.02 + (i % 6) * 0.16);
    const y = boardY + boardH * (0.02 + Math.floor(i / 6) * 0.3);
    dots.push(`<circle cx="${x}" cy="${y}" r="${Math.max(2.4, width * 0.0019)}" fill="${i % 5 === 0 ? "rgba(239,69,35,0.24)" : "rgba(71,54,254,0.14)"}"/>`);
  }

  return `
  <g>
    <rect x="${boardX}" y="${boardY}" width="${boardW}" height="${boardH}" rx="${Math.max(24, width * 0.015)}" fill="rgba(255,255,255,0.26)" stroke="rgba(71,54,254,0.08)" stroke-width="${Math.max(1, width * 0.001)}"/>
    <ellipse cx="${boardX + boardW * 0.82}" cy="${boardY + boardH * 0.18}" rx="${boardW * 0.16}" ry="${boardH * 0.18}" fill="rgba(71,54,254,0.05)"/>
    ${dots.join("\n")}
    ${cards.join("\n")}
    ${lines.join("\n")}
  </g>`;
}

function renderBatteryPassportMotif(essay, width, height, variant) {
  const isPreview = variant === "preview";
  const isSocial = variant === "social";
  const frameX = width * (isPreview ? 0.58 : isSocial ? 0.1 : 0.12);
  const frameY = height * (isPreview ? 0.18 : isSocial ? 0.34 : 0.14);
  const frameW = width * (isPreview ? 0.28 : isSocial ? 0.8 : 0.76);
  const frameH = height * (isPreview ? 0.58 : isSocial ? 0.46 : 0.7);
  const batteryX = frameX + frameW * 0.12;
  const batteryY = frameY + frameH * 0.16;
  const batteryW = frameW * 0.24;
  const batteryH = frameH * 0.56;
  const bars = [];
  for (let i = 0; i < 4; i += 1) {
    bars.push(`<rect x="${batteryX + batteryW * 0.18}" y="${batteryY + batteryH * (0.14 + i * 0.18)}" width="${batteryW * 0.5}" height="${batteryH * 0.1}" rx="${batteryH * 0.03}" fill="${i < 3 ? "rgba(71,54,254,0.88)" : "rgba(239,69,35,0.54)"}"/>`);
  }
  const cards = [];
  const cardLabels = ["SoH", "Warranty", "Transfer", "Value"];
  for (let i = 0; i < 4; i += 1) {
    const x = frameX + frameW * 0.48;
    const y = frameY + frameH * (0.12 + i * 0.18);
    cards.push(`
      <rect x="${x}" y="${y}" width="${frameW * 0.34}" height="${frameH * 0.12}" rx="${Math.max(12, width * 0.009)}" fill="rgba(255,255,255,0.95)" stroke="rgba(71,54,254,0.14)" stroke-width="${Math.max(1, width * 0.001)}"/>
      <rect x="${x + frameW * 0.04}" y="${y + frameH * 0.03}" width="${frameW * 0.09}" height="${frameH * 0.025}" rx="${frameH * 0.01}" fill="${i % 2 === 0 ? "rgba(71,54,254,0.14)" : "rgba(239,69,35,0.14)"}"/>
      <rect x="${x + frameW * 0.04}" y="${y + frameH * 0.065}" width="${frameW * 0.2}" height="${frameH * 0.018}" rx="${frameH * 0.01}" fill="rgba(22,22,22,0.08)"/>
    `);
  }
  const rings = `
    <circle cx="${batteryX + batteryW * 0.44}" cy="${batteryY + batteryH * 0.48}" r="${frameW * 0.21}" stroke="rgba(71,54,254,0.14)" stroke-width="${Math.max(2, width * 0.0014)}" fill="none"/>
    <circle cx="${batteryX + batteryW * 0.44}" cy="${batteryY + batteryH * 0.48}" r="${frameW * 0.27}" stroke="rgba(239,69,35,0.12)" stroke-width="${Math.max(2, width * 0.0014)}" fill="none" stroke-dasharray="${Math.max(10, width * 0.006)} ${Math.max(10, width * 0.006)}"/>
  `;
  const links = [];
  for (let i = 0; i < 4; i += 1) {
    const y1 = batteryY + batteryH * (0.18 + i * 0.18);
    const y2 = frameY + frameH * (0.18 + i * 0.18);
    links.push(`<path d="M ${batteryX + batteryW} ${y1} C ${frameX + frameW * 0.38} ${y1}, ${frameX + frameW * 0.42} ${y2}, ${frameX + frameW * 0.48} ${y2}" stroke="rgba(71,54,254,0.28)" stroke-width="${Math.max(1.8, width * 0.0013)}" fill="none"/>`);
  }
  return `
  <g>
    <rect x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}" rx="${Math.max(24, width * 0.014)}" fill="rgba(255,255,255,0.24)" stroke="rgba(71,54,254,0.08)" stroke-width="${Math.max(1, width * 0.001)}"/>
    ${rings}
    <rect x="${batteryX}" y="${batteryY}" width="${batteryW}" height="${batteryH}" rx="${Math.max(18, width * 0.011)}" fill="rgba(255,255,255,0.96)" stroke="rgba(71,54,254,0.18)" stroke-width="${Math.max(1.2, width * 0.001)}"/>
    <rect x="${batteryX + batteryW * 0.32}" y="${batteryY - batteryH * 0.06}" width="${batteryW * 0.18}" height="${batteryH * 0.05}" rx="${batteryH * 0.015}" fill="rgba(71,54,254,0.84)"/>
    ${bars.join("\n")}
    ${links.join("\n")}
    ${cards.join("\n")}
  </g>`;
}

function renderBuilderGeometryMotif(essay, width, height, variant) {
  const isPreview = variant === "preview";
  const isSocial = variant === "social";
  const clusterX = width * (isPreview ? 0.58 : isSocial ? 0.1 : 0.1);
  const clusterY = height * (isPreview ? 0.18 : isSocial ? 0.38 : 0.14);
  const clusterW = width * (isPreview ? 0.28 : isSocial ? 0.78 : 0.78);
  const clusterH = height * (isPreview ? 0.58 : isSocial ? 0.46 : 0.72);
  const columns = [];
  const heights = [0.18, 0.34, 0.54, 0.78];
  for (let i = 0; i < heights.length; i += 1) {
    const x = clusterX + clusterW * (0.08 + i * 0.18);
    const h = clusterH * heights[i];
    const y = clusterY + clusterH - h;
    columns.push(`
      <rect x="${x}" y="${y}" width="${clusterW * 0.12}" height="${h}" rx="${Math.max(18, width * 0.01)}" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.18)" stroke-width="${Math.max(1.2, width * 0.001)}"/>
      <rect x="${x + clusterW * 0.018}" y="${y + h * 0.12}" width="${clusterW * 0.084}" height="${Math.max(10, h * 0.14)}" rx="${Math.max(8, width * 0.006)}" fill="${i === heights.length - 1 ? "rgba(239,69,35,0.88)" : "rgba(255,255,255,0.8)"}"/>
    `);
  }
  const rails = [];
  for (let i = 0; i < 5; i += 1) {
    const y = clusterY + clusterH * (0.18 + i * 0.16);
    rails.push(`<line x1="${clusterX}" y1="${y}" x2="${clusterX + clusterW}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-width="${Math.max(1, width * 0.0009)}"/>`);
  }
  const path = `<path d="M ${clusterX + clusterW * 0.06} ${clusterY + clusterH * 0.82} C ${clusterX + clusterW * 0.22} ${clusterY + clusterH * 0.74}, ${clusterX + clusterW * 0.42} ${clusterY + clusterH * 0.58}, ${clusterX + clusterW * 0.76} ${clusterY + clusterH * 0.2}" stroke="rgba(239,69,35,0.92)" stroke-width="${Math.max(4, width * 0.0028)}" fill="none" stroke-linecap="round"/>`;
  return `
  <g>
    <rect x="${clusterX}" y="${clusterY}" width="${clusterW}" height="${clusterH}" rx="${Math.max(24, width * 0.014)}" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.08)" stroke-width="${Math.max(1, width * 0.001)}"/>
    ${rails.join("\n")}
    ${columns.join("\n")}
    ${path}
  </g>`;
}

function renderTrustStackMotif(essay, width, height, variant) {
  const isPreview = variant === "preview";
  const isSocial = variant === "social";
  const baseX = width * (isPreview ? 0.58 : isSocial ? 0.1 : 0.1);
  const baseY = height * (isPreview ? 0.18 : isSocial ? 0.42 : 0.16);
  const baseW = width * (isPreview ? 0.28 : isSocial ? 0.8 : 0.8);
  const baseH = height * (isPreview ? 0.56 : isSocial ? 0.4 : 0.66);
  const layers = [];
  const layerSpecs = [
    [0.02, 0.72, 0.92, 0.16, "rgba(255,255,255,0.14)"],
    [0.08, 0.5, 0.78, 0.14, "rgba(255,255,255,0.18)"],
    [0.16, 0.3, 0.62, 0.12, "rgba(255,255,255,0.22)"],
    [0.24, 0.14, 0.46, 0.1, "rgba(255,255,255,0.28)"]
  ];
  for (const [x, y, w, h, fill] of layerSpecs) {
    layers.push(`<rect x="${baseX + baseW * x}" y="${baseY + baseH * y}" width="${baseW * w}" height="${baseH * h}" rx="${Math.max(16, width * 0.01)}" fill="${fill}" stroke="rgba(255,255,255,0.12)" stroke-width="${Math.max(1, width * 0.001)}"/>`);
  }
  const nodes = [];
  const points = [
    [0.18, 0.8], [0.34, 0.8], [0.5, 0.8], [0.66, 0.8],
    [0.24, 0.57], [0.44, 0.57], [0.64, 0.57],
    [0.32, 0.36], [0.54, 0.36],
    [0.44, 0.19]
  ];
  points.forEach(([px, py], index) => {
    nodes.push(`<circle cx="${baseX + baseW * px}" cy="${baseY + baseH * py}" r="${Math.max(6, width * 0.004)}" fill="${index === points.length - 1 ? "rgba(239,69,35,0.92)" : "rgba(255,255,255,0.86)"}"/>`);
  });
  const paths = [
    [[0.18,0.8],[0.24,0.57]], [[0.34,0.8],[0.24,0.57]], [[0.5,0.8],[0.44,0.57]], [[0.66,0.8],[0.64,0.57]],
    [[0.24,0.57],[0.32,0.36]], [[0.44,0.57],[0.32,0.36]], [[0.44,0.57],[0.54,0.36]], [[0.64,0.57],[0.54,0.36]],
    [[0.32,0.36],[0.44,0.19]], [[0.54,0.36],[0.44,0.19]]
  ].map(([[x1,y1],[x2,y2]], i) => `<path d="M ${baseX + baseW * x1} ${baseY + baseH * y1} L ${baseX + baseW * x2} ${baseY + baseH * y2}" stroke="${i % 3 === 0 ? "rgba(239,69,35,0.72)" : "rgba(255,255,255,0.48)"}" stroke-width="${Math.max(2, width * 0.0014)}" fill="none"/>`);
  return `
  <g>
    <ellipse cx="${baseX + baseW * 0.74}" cy="${baseY + baseH * 0.18}" rx="${baseW * 0.18}" ry="${baseH * 0.2}" fill="rgba(239,69,35,0.08)"/>
    <ellipse cx="${baseX + baseW * 0.2}" cy="${baseY + baseH * 0.82}" rx="${baseW * 0.16}" ry="${baseH * 0.16}" fill="rgba(255,255,255,0.08)"/>
    ${layers.join("\n")}
    ${paths.join("\n")}
    ${nodes.join("\n")}
  </g>`;
}

function renderLearningOrbitMotif(essay, width, height, variant) {
  const isPreview = variant === "preview";
  const isSocial = variant === "social";
  const isBlog = variant === "blog";
  const frameX = width * (isPreview ? 0.56 : isSocial ? 0.08 : isBlog ? 0.08 : 0.1);
  const frameY = height * (isPreview ? 0.18 : isSocial ? 0.4 : isBlog ? 0.12 : 0.16);
  const frameW = width * (isPreview ? 0.34 : isSocial ? 0.84 : isBlog ? 0.82 : 0.8);
  const frameH = height * (isPreview ? 0.56 : isSocial ? 0.42 : isBlog ? 0.7 : 0.66);
  const cx = frameX + frameW * 0.62;
  const cy = frameY + frameH * (isBlog ? 0.46 : 0.5);
  const coreR = Math.min(frameW, frameH) * (isPreview ? 0.12 : isSocial ? 0.11 : isBlog ? 0.14 : 0.12);

  const layers = [];
  const layerSpecs = [
    [0.06, 0.76, 0.78, 0.1, "rgba(255,255,255,0.42)"],
    [0.12, 0.62, 0.66, 0.09, "rgba(255,255,255,0.58)"],
    [0.18, 0.5, 0.54, 0.085, "rgba(255,255,255,0.74)"],
    [0.25, 0.39, 0.42, 0.08, "rgba(255,255,255,0.9)"]
  ];

  for (const [x, y, w, h, fill] of layerSpecs) {
    layers.push(`
      <rect x="${frameX + frameW * x}" y="${frameY + frameH * y}" width="${frameW * w}" height="${frameH * h}"
            rx="${Math.max(16, width * 0.011)}"
            fill="${fill}"
            stroke="rgba(71,54,254,0.12)"
            stroke-width="${Math.max(1, width * 0.001)}"/>
    `);
  }

  const orbitGroup = [];
  const orbitSpecs = [
    [coreR * 1.95, coreR * 0.98, 12, "rgba(71,54,254,0.36)", "rgba(71,54,254,0.88)"],
    [coreR * 2.25, coreR * 1.22, -20, "rgba(239,69,35,0.28)", "rgba(239,69,35,0.92)"],
    [coreR * 2.6, coreR * 1.46, 30, "rgba(71,54,254,0.24)", "rgba(71,54,254,0.74)"]
  ];

  orbitSpecs.forEach(([rx, ry, rotate, stroke, nodeFill], index) => {
    orbitGroup.push(`
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
               transform="rotate(${rotate} ${cx} ${cy})"
               fill="none"
               stroke="${stroke}"
               stroke-width="${Math.max(2, width * 0.0015)}"/>
    `);
    const nodeAngles = index === 1 ? [28, 202] : index === 2 ? [98, 282] : [338, 158];
    nodeAngles.forEach((angle) => {
      const point = pointOnEllipse(cx, cy, rx, ry, rotate, angle);
      orbitGroup.push(`
        <g filter="url(#fineGlow)">
          <circle cx="${point.x}" cy="${point.y}" r="${Math.max(7, width * 0.0046)}" fill="rgba(255,255,255,0.96)"/>
          <circle cx="${point.x}" cy="${point.y}" r="${Math.max(3.1, width * 0.0023)}" fill="${nodeFill}"/>
        </g>
      `);
    });
  });

  const anchorLines = [
    [frameX + frameW * 0.26, frameY + frameH * 0.8, cx - coreR * 1.9, cy + coreR * 0.65],
    [frameX + frameW * 0.31, frameY + frameH * 0.67, cx - coreR * 1.35, cy + coreR * 0.15],
    [frameX + frameW * 0.36, frameY + frameH * 0.55, cx - coreR * 0.95, cy - coreR * 0.35]
  ]
    .map(([x1, y1, x2, y2], index) => `
      <path d="M ${x1} ${y1} C ${x1 + frameW * 0.12} ${y1}, ${x2 - frameW * 0.05} ${y2}, ${x2} ${y2}"
            stroke="${index === 1 ? "rgba(239,69,35,0.34)" : "rgba(71,54,254,0.28)"}"
            stroke-width="${Math.max(1.8, width * 0.00125)}"
            fill="none"
            stroke-linecap="round"/>
    `)
    .join("\n");

  const chips = [
    [0.12, 0.79, 0.14, "cool"],
    [0.16, 0.66, 0.18, "warm"],
    [0.2, 0.53, 0.15, "cool"]
  ]
    .map(([x, y, w, accent]) => renderSignalChip({
      x: frameX + frameW * x,
      y: frameY + frameH * y,
      w: frameW * w,
      h: frameH * 0.06,
      accent
    }))
    .join("");

  const core = `
    <g filter="url(#softGlow)">
      <circle cx="${cx}" cy="${cy}" r="${coreR * 1.08}" fill="rgba(255,255,255,0.95)" stroke="rgba(71,54,254,0.22)" stroke-width="${Math.max(1.5, width * 0.0012)}"/>
      <circle cx="${cx}" cy="${cy}" r="${coreR * 0.72}" fill="rgba(71,54,254,0.08)" stroke="rgba(71,54,254,0.18)" stroke-width="${Math.max(1.2, width * 0.0011)}"/>
      <circle cx="${cx}" cy="${cy}" r="${coreR * 0.26}" fill="rgba(239,69,35,0.92)"/>
    </g>
  `;

  const verticalRail = `
    <path d="M ${cx} ${frameY + frameH * 0.24} L ${cx} ${frameY + frameH * 0.85}"
          stroke="rgba(71,54,254,0.18)"
          stroke-width="${Math.max(2.2, width * 0.0017)}"
          stroke-linecap="round"/>
  `;

  const particles = renderParticles({
    width,
    height,
    count: isBlog ? 56 : isPreview ? 34 : 42,
    region: [frameX + frameW * 0.18, frameY + frameH * 0.16, frameW * 0.7, frameH * 0.62],
    colors: ["rgba(71,54,254,0.12)", "rgba(239,69,35,0.16)", "rgba(71,54,254,0.08)"],
    seed: 417
  });

  return `
  <g>
    <ellipse cx="${frameX + frameW * 0.74}" cy="${frameY + frameH * 0.2}" rx="${frameW * 0.16}" ry="${frameH * 0.18}" fill="rgba(71,54,254,0.05)"/>
    <ellipse cx="${frameX + frameW * 0.2}" cy="${frameY + frameH * 0.88}" rx="${frameW * 0.14}" ry="${frameH * 0.14}" fill="rgba(239,69,35,0.04)"/>
    ${layers.join("\n")}
    ${anchorLines}
    ${chips}
    ${verticalRail}
    ${orbitGroup.join("\n")}
    ${core}
    ${particles}
  </g>`;
}

function renderSignalCard({ x, y, w, h, accent }) {
  const fill = accent === "warm" ? "rgba(239,69,35,0.14)" : "rgba(71,54,254,0.14)";
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.max(12, w * 0.045)}" fill="rgba(255,255,255,0.94)" stroke="rgba(71,54,254,0.16)" stroke-width="${Math.max(1, w * 0.004)}"/>
      <rect x="${x + w * 0.08}" y="${y + h * 0.18}" width="${w * 0.24}" height="${h * 0.12}" rx="${h * 0.05}" fill="${fill}"/>
      <rect x="${x + w * 0.08}" y="${y + h * 0.42}" width="${w * 0.52}" height="${h * 0.1}" rx="${h * 0.05}" fill="rgba(22,22,22,0.08)"/>
      <rect x="${x + w * 0.08}" y="${y + h * 0.62}" width="${w * 0.4}" height="${h * 0.08}" rx="${h * 0.05}" fill="rgba(22,22,22,0.05)"/>
    </g>
  `;
}

function renderSignalChip({ x, y, w, h, accent }) {
  const fill = accent === "warm" ? "rgba(239,69,35,0.12)" : "rgba(71,54,254,0.12)";
  const accentFill = accent === "warm" ? "rgba(239,69,35,0.84)" : "rgba(71,54,254,0.84)";
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.max(10, h * 0.4)}" fill="rgba(255,255,255,0.96)" stroke="rgba(71,54,254,0.12)" stroke-width="${Math.max(1, w * 0.004)}"/>
      <rect x="${x + w * 0.1}" y="${y + h * 0.22}" width="${w * 0.24}" height="${h * 0.18}" rx="${h * 0.09}" fill="${fill}"/>
      <rect x="${x + w * 0.1}" y="${y + h * 0.52}" width="${w * 0.5}" height="${h * 0.12}" rx="${h * 0.07}" fill="rgba(22,22,22,0.07)"/>
      <circle cx="${x + w * 0.82}" cy="${y + h * 0.5}" r="${Math.max(4.5, h * 0.18)}" fill="${accentFill}"/>
    </g>
  `;
}

function pointOnEllipse(cx, cy, rx, ry, rotationDeg, angleDeg) {
  const t = (angleDeg * Math.PI) / 180;
  const rotation = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  const ex = rx * Math.cos(t);
  const ey = ry * Math.sin(t);
  return {
    x: cx + ex * cosR - ey * sinR,
    y: cy + ex * sinR + ey * cosR
  };
}

function roadStroke(pathD, widthPx, fill) {
  return `
    <path d="${pathD}" stroke="${fill}" stroke-width="${widthPx}" stroke-linecap="square" fill="none"/>
    <path d="${pathD}" stroke="rgba(255,255,255,0.12)" stroke-width="${Math.max(2, widthPx * 0.03)}" stroke-linecap="square" fill="none"/>
  `;
}

function laneDashedPath(pathD, strokeWidth) {
  return `<path d="${pathD}" stroke="rgba(245,239,228,0.72)" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${strokeWidth * 1.8} ${strokeWidth * 1.8}" fill="none"/>`;
}

function zebraCrossing(x, y, widthPx, heightPx, rotationDeg) {
  const stripes = [];
  const stripeCount = 6;
  const stripeGap = heightPx / stripeCount;
  for (let i = 0; i < stripeCount; i += 1) {
    stripes.push(`<rect x="${x - widthPx / 2}" y="${y - heightPx / 2 + i * stripeGap}" width="${widthPx}" height="${stripeGap * 0.55}" fill="rgba(245,239,228,0.82)"/>`);
  }
  return `<g transform="rotate(${rotationDeg} ${x} ${y})">${stripes.join("\n")}</g>`;
}

function renderParticles({ width, height, count, region, colors, seed }) {
  const [x0, y0, w, h] = region;
  const rng = mulberry32(seed + width + height + count);
  const dots = [];

  for (let i = 0; i < count; i += 1) {
    const x = x0 + rng() * w;
    const y = y0 + rng() * h;
    const radius = Math.max(0.6, rng() * width * 0.0022);
    const color = colors[Math.floor(rng() * colors.length)];
    dots.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" fill="${color}"/>`);
  }

  return `<g filter="url(#fineGlow)">${dots.join("")}</g>`;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let n = Math.imul(t ^ (t >>> 15), 1 | t);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
