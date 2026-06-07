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

const essays = [
  {
    slug: "indias-road-deaths-trust-problem",
    title: "India's Road Deaths Are a Trust Problem",
    titleLines: ["India's road", "deaths are a", "trust problem."],
    accentLineIndex: 2,
    subtitle: "Not a traffic problem.",
    description: "Road safety fails when truth dies at each handoff.",
    motif: "flowboard",
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
    motif: "ai",
    textMode: "architectural",
    backgroundMode: "default",
    palette: {
      bgTop: "#080D1E",
      bgMid: "#131D45",
      bgBottom: "#090C18",
      glowPrimary: "#5D49FF",
      glowSecondary: "#F08A45",
      titlePrimary: "#FFF9F0",
      titleAccent: "#8E7BFF",
      subtitle: "#F2C7AB",
      description: "#ECE6DC"
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
  const motif = essay.motif === "flowboard"
    ? renderFlowBoardIllustration(essay, width, height, variant)
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

function renderTextBlock(essay, width, height, variant) {
  if (essay.textMode === "civic") {
    return renderCivicTextBlock(essay, width, height, variant);
  }

  if (essay.textMode === "architectural") {
    return renderArchitecturalTextBlock(essay, width, height, variant);
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

function renderFlowBoardIllustration(essay, width, height, variant) {
  const isPreview = variant === "preview";
  const isSocial = variant === "social";
  const isBlog = variant === "blog";

  const boardX = width * (isPreview ? 0.62 : isSocial ? 0.56 : isBlog ? 0.39 : 0.54);
  const boardY = height * (isPreview ? 0.16 : isSocial ? 0.41 : isBlog ? 0.17 : 0.19);
  const boardW = width * (isPreview ? 0.26 : isSocial ? 0.28 : isBlog ? 0.46 : 0.31);
  const boardH = height * (isPreview ? 0.5 : isSocial ? 0.39 : isBlog ? 0.54 : 0.5);

  const halo = renderParticles({
    width,
    height,
    count: isPreview ? 70 : isSocial ? 95 : isBlog ? 125 : 95,
    region: [boardX - width * 0.08, boardY - height * 0.08, boardW + width * 0.12, boardH + height * 0.12],
    colors: ["rgba(71,54,254,0.05)", "rgba(71,54,254,0.09)", "rgba(71,54,254,0.12)"],
    seed: 96
  });

  const board = `
    <rect x="${boardX}" y="${boardY}" width="${boardW}" height="${boardH}" rx="${Math.max(18, width * 0.016)}"
          fill="rgba(255,255,255,0.42)" stroke="rgba(71,54,254,0.16)" stroke-width="${Math.max(1.2, width * 0.0012)}"/>
    <rect x="${boardX + boardW * 0.07}" y="${boardY + boardH * 0.12}" width="${boardW * 0.86}" height="${Math.max(1, boardH * 0.0026)}" fill="rgba(71,54,254,0.11)"/>
    <rect x="${boardX + boardW * 0.07}" y="${boardY + boardH * 0.5}" width="${boardW * 0.86}" height="${Math.max(1, boardH * 0.0026)}" fill="rgba(71,54,254,0.11)"/>
  `;

  const nodeW = boardW * 0.28;
  const nodeH = boardH * 0.25;
  const nodeA = { x: boardX + boardW * 0.09, y: boardY + boardH * 0.12, icon: "triangle", color: "rgba(239,69,35,0.95)" };
  const nodeB = { x: boardX + boardW * 0.39, y: boardY + boardH * 0.37, icon: "plus", color: "rgba(71,54,254,0.92)" };
  const nodeC = { x: boardX + boardW * 0.63, y: boardY + boardH * 0.62, icon: "document", color: "rgba(71,54,254,0.92)" };

  const nodes = [
    renderFlowNode({ ...nodeA, w: nodeW, h: nodeH, strokeColor: "rgba(71,54,254,0.12)" }),
    renderFlowNode({ ...nodeB, w: nodeW, h: nodeH, strokeColor: "rgba(71,54,254,0.12)" }),
    renderFlowNode({ ...nodeC, w: nodeW, h: nodeH, strokeColor: "rgba(71,54,254,0.12)" })
  ];

  const aCx = nodeA.x + nodeW * 0.8;
  const aCy = nodeA.y + nodeH * 0.62;
  const bCx = nodeB.x + nodeW * 0.2;
  const bCy = nodeB.y + nodeH * 0.38;
  const cCx = nodeC.x + nodeW * 0.22;
  const cCy = nodeC.y + nodeH * 0.36;

  const breakOneX = boardX + boardW * 0.43;
  const breakOneY = boardY + boardH * 0.33;
  const breakTwoX = boardX + boardW * 0.67;
  const breakTwoY = boardY + boardH * 0.58;

  const flowLines = `
    <path d="M ${boardX + boardW * 0.02} ${boardY + boardH * 0.28}
             L ${nodeA.x - boardW * 0.03} ${boardY + boardH * 0.28}
             L ${nodeA.x - boardW * 0.03} ${aCy}
             L ${aCx} ${aCy}"
          stroke="rgba(71,54,254,0.24)" stroke-width="${Math.max(2, width * 0.0019)}" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-dasharray="${Math.max(8, width * 0.006)} ${Math.max(8, width * 0.006)}"/>
    <path d="M ${aCx + boardW * 0.02} ${aCy}
             L ${breakOneX - boardW * 0.03} ${aCy}
             L ${breakOneX - boardW * 0.03} ${breakOneY}"
          stroke="rgba(71,54,254,0.24)" stroke-width="${Math.max(2, width * 0.0019)}" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-dasharray="${Math.max(8, width * 0.006)} ${Math.max(8, width * 0.006)}"/>
    <path d="M ${breakOneX + boardW * 0.03} ${breakOneY}
             L ${bCx} ${breakOneY}
             L ${bCx} ${bCy}"
          stroke="rgba(71,54,254,0.24)" stroke-width="${Math.max(2, width * 0.0019)}" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-dasharray="${Math.max(8, width * 0.006)} ${Math.max(8, width * 0.006)}"/>
    <path d="M ${nodeB.x + nodeW * 0.82} ${nodeB.y + nodeH * 0.64}
             L ${breakTwoX - boardW * 0.03} ${nodeB.y + nodeH * 0.64}
             L ${breakTwoX - boardW * 0.03} ${breakTwoY}"
          stroke="rgba(71,54,254,0.24)" stroke-width="${Math.max(2, width * 0.0019)}" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-dasharray="${Math.max(8, width * 0.006)} ${Math.max(8, width * 0.006)}"/>
    <path d="M ${breakTwoX + boardW * 0.03} ${breakTwoY}
             L ${cCx} ${breakTwoY}
             L ${cCx} ${cCy}"
          stroke="rgba(71,54,254,0.24)" stroke-width="${Math.max(2, width * 0.0019)}" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-dasharray="${Math.max(8, width * 0.006)} ${Math.max(8, width * 0.006)}"/>
    <circle cx="${breakOneX}" cy="${breakOneY}" r="${Math.max(4, width * 0.0034)}" fill="rgba(239,69,35,0.92)"/>
    <circle cx="${breakTwoX}" cy="${breakTwoY}" r="${Math.max(4, width * 0.0034)}" fill="rgba(239,69,35,0.92)"/>
  `;

  const labels = isBlog
    ? `
      <rect x="${boardX + boardW * 0.05}" y="${boardY + boardH * 0.03}" width="${boardW * 0.16}" height="${boardH * 0.08}" rx="${boardH * 0.02}" fill="rgba(239,69,35,0.12)"/>
      <rect x="${boardX + boardW * 0.79}" y="${boardY + boardH * 0.89}" width="${boardW * 0.13}" height="${boardH * 0.06}" rx="${boardH * 0.018}" fill="rgba(71,54,254,0.12)"/>
    `
    : "";

  return `
  <g>
    ${halo}
    ${board}
    ${flowLines}
    ${labels}
    ${nodes.join("\n")}
  </g>`;
}

function renderFlowNode({ x, y, w, h, icon, color, strokeColor }) {
  const line1 = `<rect x="${x + w * 0.14}" y="${y + h * 0.18}" width="${w * 0.34}" height="${h * 0.06}" rx="${h * 0.02}" fill="rgba(22,22,22,0.1)"/>`;
  const line2 = `<rect x="${x + w * 0.14}" y="${y + h * 0.31}" width="${w * 0.48}" height="${h * 0.06}" rx="${h * 0.02}" fill="rgba(22,22,22,0.08)"/>`;
  const line3 = `<rect x="${x + w * 0.14}" y="${y + h * 0.44}" width="${w * 0.28}" height="${h * 0.06}" rx="${h * 0.02}" fill="rgba(22,22,22,0.06)"/>`;

  let iconMarkup = "";

  if (icon === "triangle") {
    const cx = x + w * 0.72;
    const cy = y + h * 0.6;
    const size = w * 0.12;
    iconMarkup = `
      <path d="M ${cx} ${cy - size}
               L ${cx - size * 0.9} ${cy + size * 0.68}
               L ${cx + size * 0.9} ${cy + size * 0.68} Z"
            fill="rgba(255,255,255,0.92)" stroke="${color}" stroke-width="${Math.max(1.8, w * 0.02)}"/>
    `;
  } else if (icon === "plus") {
    const cx = x + w * 0.72;
    const cy = y + h * 0.58;
    iconMarkup = `
      <rect x="${cx - w * 0.08}" y="${cy - w * 0.018}" width="${w * 0.16}" height="${w * 0.036}" rx="${w * 0.01}" fill="${color}"/>
      <rect x="${cx - w * 0.018}" y="${cy - w * 0.08}" width="${w * 0.036}" height="${w * 0.16}" rx="${w * 0.01}" fill="${color}"/>
    `;
  } else {
    const iconX = x + w * 0.62;
    const iconY = y + h * 0.47;
    const iconW = w * 0.2;
    const iconH = h * 0.24;
    iconMarkup = `
      <rect x="${iconX}" y="${iconY}" width="${iconW}" height="${iconH}" rx="${w * 0.02}" fill="rgba(71,54,254,0.08)" stroke="${color}" stroke-width="${Math.max(1.4, w * 0.012)}"/>
      <rect x="${iconX + iconW * 0.18}" y="${iconY + iconH * 0.2}" width="${iconW * 0.64}" height="${iconH * 0.12}" rx="${w * 0.01}" fill="${color}" opacity="0.9"/>
      <rect x="${iconX + iconW * 0.18}" y="${iconY + iconH * 0.44}" width="${iconW * 0.44}" height="${iconH * 0.12}" rx="${w * 0.01}" fill="${color}" opacity="0.55"/>
    `;
  }

  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.max(12, w * 0.08)}" fill="rgba(255,255,255,0.82)" stroke="${strokeColor}" stroke-width="${Math.max(1, w * 0.01)}"/>
      ${line1}
      ${line2}
      ${line3}
      ${iconMarkup}
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
