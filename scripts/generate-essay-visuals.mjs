import { promises as fs } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rootDir = process.cwd();
const mediaDir = path.join(rootDir, "src", "media");

const pageSize = { width: 1200, height: 630 };
const articleSize = { width: 1672, height: 941 };

const themes = {
  light: {
    mode: "light",
    bgTop: "#F2EDFF",
    bgMid: "#E9E2FF",
    bgBottom: "#DDD2FF",
    grid: "rgba(71,54,254,0.08)",
    stroke: "rgba(71,54,254,0.36)",
    soft: "rgba(71,54,254,0.18)",
    card: "rgba(255,255,255,0.94)",
    cardStroke: "rgba(71,54,254,0.22)",
    accent: "rgba(71,54,254,0.92)",
    accentSoft: "rgba(71,54,254,0.18)",
    ember: "rgba(239,69,35,0.9)",
    emberSoft: "rgba(239,69,35,0.18)",
    white: "rgba(255,255,255,0.96)"
  },
  dark: {
    mode: "dark",
    bgTop: "#5A4DFF",
    bgMid: "#4736FE",
    bgBottom: "#1D145F",
    grid: "rgba(255,255,255,0.08)",
    stroke: "rgba(255,255,255,0.26)",
    soft: "rgba(255,255,255,0.14)",
    card: "rgba(255,255,255,0.08)",
    cardStroke: "rgba(255,255,255,0.16)",
    accent: "rgba(255,255,255,0.96)",
    accentSoft: "rgba(255,255,255,0.16)",
    ember: "rgba(239,69,35,0.92)",
    emberSoft: "rgba(239,69,35,0.18)",
    white: "rgba(255,255,255,0.96)"
  }
};

const essays = [
  {
    key: "the-coming-decade-of-car-ownership-in-india",
    imageAsset: "the-coming-decade-of-car-ownership-in-india-preview",
    articleAsset: "the-coming-decade-of-car-ownership-in-india-blog",
    theme: "light",
    motif: "ownership-ledger"
  },
  {
    key: "used-car-ownership-is-a-lending-problem",
    imageAsset: "used-car-ownership-is-a-lending-problem-preview",
    articleAsset: "used-car-ownership-is-a-lending-problem-blog",
    theme: "light",
    motif: "lending-lattice"
  },
  {
    key: "the-greenest-car-in-india-is-the-one-already-built",
    imageAsset: "the-greenest-car-in-india-is-the-one-already-built-preview",
    articleAsset: "the-greenest-car-in-india-is-the-one-already-built-blog",
    theme: "light",
    motif: "reuse-ring"
  },
  {
    key: "indias-road-deaths-trust-problem",
    imageAsset: "indias-road-deaths-trust-problem-preview",
    articleAsset: "indias-road-deaths-trust-problem-blog",
    theme: "light",
    motif: "road-forensics"
  },
  {
    key: "why-we-are-not-selling-cars",
    imageAsset: "why-we-are-not-selling-cars-preview",
    articleAsset: "why-we-are-not-selling-cars-blog",
    theme: "dark",
    motif: "trust-stack"
  },
  {
    key: "scale-is-a-learning-problem",
    imageAsset: "scale-is-a-learning-problem-preview",
    articleAsset: "scale-is-a-learning-problem-blog",
    theme: "light",
    motif: "learning-orbits"
  },
  {
    key: "ai-native-is-not-ai-first",
    imageAsset: "ai-native-is-not-ai-first-preview",
    articleAsset: "ai-native-is-not-ai-first-blog",
    theme: "light",
    motif: "context-loom"
  },
  {
    key: "builder-is-the-only-role-left",
    imageAsset: "builder-is-the-only-role-left-preview",
    articleAsset: "builder-is-the-only-role-left-blog",
    theme: "dark",
    motif: "builder-geometry"
  },
  {
    key: "execution-problems-begin-as-trust-problems",
    imageAsset: "execution-problems-begin-as-trust-problems-preview",
    articleAsset: "execution-problems-begin-as-trust-problems-blog",
    theme: "dark",
    motif: "execution-bridge"
  },
  {
    key: "ai-will-do-for-consumer-what-saas-did-for-software",
    imageAsset: "ai-will-do-for-consumer-what-saas-did-for-software-preview",
    articleAsset: "ai-will-do-for-consumer-what-saas-did-for-software-blog",
    theme: "light",
    motif: "export-arc"
  },
  {
    key: "paranoid-survive-regulated-thrive",
    imageAsset: "paranoid-survive-regulated-thrive-social",
    articleAsset: "paranoid-survive-regulated-thrive-blog",
    theme: "dark",
    motif: "vigilance-field"
  },
  {
    key: "who-taught-you-to-want-this",
    imageAsset: "who-taught-you-to-want-this-preview",
    articleAsset: "who-taught-you-to-want-this-blog",
    theme: "dark",
    motif: "desire-orbits"
  },
  {
    key: "you-judge-others-by-character-and-yourself-by-circumstance",
    imageAsset: "you-judge-others-by-character-and-yourself-by-circumstance-preview",
    articleAsset: "you-judge-others-by-character-and-yourself-by-circumstance-blog",
    theme: "light",
    motif: "circumstance-lenses"
  }
];

await fs.mkdir(mediaDir, { recursive: true });

for (const essay of essays) {
  await writeAsset(essay.imageAsset, pageSize, essay);
  await writeAsset(essay.articleAsset, articleSize, essay);
}

console.log(`Generated ${essays.length * 2} essay visuals in ${mediaDir}`);

async function writeAsset(baseName, size, essay) {
  const svg = renderEssayVisual(essay, size.width, size.height);
  const svgPath = path.join(mediaDir, `${baseName}.svg`);
  const pngPath = path.join(mediaDir, `${baseName}.png`);
  await fs.writeFile(svgPath, svg, "utf8");
  execFileSync("sips", ["-s", "format", "png", svgPath, "--out", pngPath], { stdio: "ignore" });
}

function renderEssayVisual(essay, width, height) {
  const theme = themes[essay.theme];
  const motif = renderMotif(essay.motif, theme, width, height);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${width}" y2="${height}">
      <stop offset="0%" stop-color="${theme.bgTop}"/>
      <stop offset="46%" stop-color="${theme.bgMid}"/>
      <stop offset="100%" stop-color="${theme.bgBottom}"/>
    </linearGradient>
    <radialGradient id="glow-left" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${width * 0.14} ${height * 0.1}) rotate(38) scale(${width * 0.34} ${height * 0.5})">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="${essay.theme === "dark" ? "0.22" : "0.1"}"/>
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-right" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${width * 0.84} ${height * 0.64}) rotate(210) scale(${width * 0.24} ${height * 0.34})">
      <stop offset="0%" stop-color="${theme.ember}" stop-opacity="${essay.theme === "dark" ? "0.18" : "0.08"}"/>
      <stop offset="100%" stop-color="${theme.ember}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${Math.max(6, width * 0.006)}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="fine-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${Math.max(2.4, width * 0.0024)}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" rx="${Math.max(24, width * 0.02)}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glow-left)"/>
  <rect width="${width}" height="${height}" fill="url(#glow-right)"/>
  ${renderScaffold(theme, width, height)}
  ${motif}
</svg>`;
}

function renderScaffold(theme, width, height) {
  const grid = [];
  for (let i = 0; i <= 8; i += 1) {
    const x = width * 0.06 + (width * 0.88 * i) / 8;
    grid.push(`<line x1="${x}" y1="${height * 0.08}" x2="${x}" y2="${height * 0.92}" stroke="${theme.grid}" stroke-width="${Math.max(1, width * 0.0008)}"/>`);
  }
  for (let i = 0; i <= 5; i += 1) {
    const y = height * 0.1 + (height * 0.8 * i) / 5;
    grid.push(`<line x1="${width * 0.05}" y1="${y}" x2="${width * 0.95}" y2="${y}" stroke="${theme.grid}" stroke-width="${Math.max(1, width * 0.0008)}"/>`);
  }
  return `
  <ellipse cx="${width * 0.82}" cy="${height * 0.22}" rx="${width * 0.18}" ry="${height * 0.2}" fill="${theme.soft}"/>
  <ellipse cx="${width * 0.15}" cy="${height * 0.82}" rx="${width * 0.16}" ry="${height * 0.18}" fill="${theme.emberSoft}"/>
  <rect x="${width * 0.075}" y="${height * 0.085}" width="${width * 0.11}" height="${Math.max(6, height * 0.01)}" rx="${Math.max(2, height * 0.003)}" fill="${essayBar(theme)}"/>
  <rect x="${width * 0.84}" y="${height * 0.885}" width="${width * 0.08}" height="${Math.max(6, height * 0.01)}" rx="${Math.max(2, height * 0.003)}" fill="${theme.ember}"/>
  <g>${grid.join("")}</g>`;
}

function essayBar(theme) {
  return theme.white || theme.accent;
}

function renderMotif(motif, theme, width, height) {
  switch (motif) {
    case "ownership-ledger":
      return renderOwnershipLedger(theme, width, height);
    case "lending-lattice":
      return renderLendingLattice(theme, width, height);
    case "reuse-ring":
      return renderReuseRing(theme, width, height);
    case "road-forensics":
      return renderRoadForensics(theme, width, height);
    case "trust-stack":
      return renderTrustStack(theme, width, height);
    case "learning-orbits":
      return renderLearningOrbits(theme, width, height);
    case "context-loom":
      return renderContextLoom(theme, width, height);
    case "builder-geometry":
      return renderBuilderGeometry(theme, width, height);
    case "execution-bridge":
      return renderExecutionBridge(theme, width, height);
    case "export-arc":
      return renderExportArc(theme, width, height);
    case "vigilance-field":
      return renderVigilanceField(theme, width, height);
    case "desire-orbits":
      return renderDesireOrbits(theme, width, height);
    case "circumstance-lenses":
      return renderCircumstanceLenses(theme, width, height);
    default:
      return "";
  }
}

function renderOwnershipLedger(theme, width, height) {
  const x = width * 0.56;
  const y = height * 0.16;
  const w = width * 0.28;
  const h = height * 0.58;
  const cards = [];
  for (let i = 0; i < 4; i += 1) {
    const cy = y + h * (0.08 + i * 0.2);
    const cw = w * (0.64 + (i % 2) * 0.18);
    const ch = h * 0.14;
    cards.push(card(x + w * 0.06, cy, cw, ch, theme));
    cards.push(dot(x + w * 0.8, cy + ch * 0.5, Math.max(7, width * 0.005), i % 2 === 0 ? theme.accent : theme.ember));
    if (i < 3) {
      const ny = y + h * (0.08 + (i + 1) * 0.2) + ch * 0.5;
      cards.push(`<path d="M ${x + w * 0.8} ${cy + ch * 0.5} C ${x + w * 0.87} ${cy + ch * 0.5}, ${x + w * 0.87} ${ny}, ${x + w * 0.8} ${ny}" stroke="${theme.stroke}" stroke-width="${Math.max(2, width * 0.0016)}" stroke-dasharray="${Math.max(6, width * 0.004)} ${Math.max(7, width * 0.005)}" fill="none"/>`);
    }
  }
  return `<g>${panel(x, y, w, h, theme)}${cards.join("")}${particles(width, height, [x, y, w, h], theme, 28, 11)}</g>`;
}

function renderLendingLattice(theme, width, height) {
  const x = width * 0.56;
  const y = height * 0.14;
  const w = width * 0.3;
  const h = height * 0.62;
  const car = carPod(x + w * 0.24, y + h * 0.3, w * 0.34, h * 0.22, theme, width);
  const columns = [];
  const starts = [0.12, 0.38, 0.64];
  starts.forEach((ratio, index) => {
    const sy = y + h * (0.18 + index * 0.22);
    columns.push(`<rect x="${x + w * 0.02}" y="${sy}" width="${w * 0.18}" height="${h * 0.12}" rx="${Math.max(12, width * 0.008)}" fill="${theme.card}" stroke="${theme.cardStroke}" stroke-width="${Math.max(1, width * 0.001)}"/>`);
    columns.push(`<rect x="${x + w * 0.62}" y="${sy}" width="${w * 0.18}" height="${h * 0.12}" rx="${Math.max(12, width * 0.008)}" fill="${theme.card}" stroke="${theme.cardStroke}" stroke-width="${Math.max(1, width * 0.001)}"/>`);
    columns.push(`<path d="M ${x + w * 0.2} ${sy + h * 0.06} C ${x + w * 0.3} ${sy + h * 0.06}, ${x + w * 0.34} ${y + h * 0.42}, ${x + w * 0.41} ${y + h * 0.42}" stroke="${index === 1 ? theme.ember : theme.accent}" stroke-width="${Math.max(2.2, width * 0.0018)}" fill="none" stroke-linecap="round"/>`);
    columns.push(`<path d="M ${x + w * 0.59} ${y + h * 0.42} C ${x + w * 0.66} ${y + h * 0.42}, ${x + w * 0.68} ${sy + h * 0.06}, ${x + w * 0.62} ${sy + h * 0.06}" stroke="${index === 1 ? theme.ember : theme.accent}" stroke-width="${Math.max(2.2, width * 0.0018)}" fill="none" stroke-linecap="round"/>`);
  });
  return `<g>${panel(x, y, w, h, theme)}${columns.join("")}${car}${particles(width, height, [x, y, w, h], theme, 26, 17)}</g>`;
}

function renderReuseRing(theme, width, height) {
  const x = width * 0.56;
  const y = height * 0.14;
  const w = width * 0.3;
  const h = height * 0.62;
  const cx = x + w * 0.5;
  const cy = y + h * 0.5;
  const r = Math.min(w, h) * 0.28;
  return `<g>
    ${panel(x, y, w, h, theme)}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${theme.stroke}" stroke-width="${Math.max(3, width * 0.0022)}"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 1.28}" fill="none" stroke="${theme.emberSoft}" stroke-width="${Math.max(3, width * 0.0022)}" stroke-dasharray="${Math.max(14, width * 0.01)} ${Math.max(10, width * 0.007)}"/>
    <path d="M ${cx - r * 0.32} ${cy - r * 0.88} C ${cx - r * 0.06} ${cy - r * 1.04}, ${cx + r * 0.18} ${cy - r * 1.04}, ${cx + r * 0.36} ${cy - r * 0.84}" stroke="${theme.accent}" stroke-width="${Math.max(4, width * 0.003)}" fill="none" stroke-linecap="round"/>
    <path d="M ${cx + r * 0.8} ${cy + r * 0.18} C ${cx + r * 0.92} ${cy + r * 0.42}, ${cx + r * 0.94} ${cy + r * 0.65}, ${cx + r * 0.82} ${cy + r * 0.86}" stroke="${theme.ember}" stroke-width="${Math.max(4, width * 0.003)}" fill="none" stroke-linecap="round"/>
    ${battery(cx - r * 0.34, cy - r * 0.24, r * 0.68, r * 0.48, theme, width)}
    ${particles(width, height, [x, y, w, h], theme, 22, 23)}
  </g>`;
}

function renderRoadForensics(theme, width, height) {
  const x = width * 0.54;
  const y = height * 0.14;
  const w = width * 0.32;
  const h = height * 0.62;
  const hotspotX = x + w * 0.62;
  const hotspotY = y + h * 0.42;
  return `<g>
    ${panel(x, y, w, h, theme)}
    ${gridBox(x + w * 0.06, y + h * 0.08, w * 0.86, h * 0.76, theme, 6, 4)}
    <path d="M ${x + w * 0.16} ${y + h * 0.7} C ${x + w * 0.28} ${y + h * 0.56}, ${x + w * 0.44} ${y + h * 0.48}, ${hotspotX} ${hotspotY}" stroke="${theme.stroke}" stroke-width="${Math.max(3, width * 0.002)}" fill="none" stroke-linecap="round"/>
    <path d="M ${x + w * 0.22} ${y + h * 0.2} C ${x + w * 0.34} ${y + h * 0.3}, ${x + w * 0.48} ${y + h * 0.36}, ${hotspotX} ${hotspotY}" stroke="${theme.soft}" stroke-width="${Math.max(3, width * 0.002)}" fill="none" stroke-linecap="round"/>
    <path d="M ${x + w * 0.76} ${y + h * 0.2} C ${x + w * 0.72} ${y + h * 0.3}, ${x + w * 0.68} ${y + h * 0.34}, ${hotspotX} ${hotspotY}" stroke="${theme.soft}" stroke-width="${Math.max(3, width * 0.002)}" fill="none" stroke-linecap="round"/>
    ${dot(hotspotX, hotspotY, Math.max(10, width * 0.0072), theme.ember)}
    <circle cx="${hotspotX}" cy="${hotspotY}" r="${Math.max(24, width * 0.017)}" stroke="${theme.emberSoft}" stroke-width="${Math.max(2, width * 0.0015)}" fill="none"/>
    ${card(x + w * 0.56, y + h * 0.14, w * 0.26, h * 0.18, theme)}
    ${card(x + w * 0.18, y + h * 0.54, w * 0.22, h * 0.14, theme)}
    ${particles(width, height, [x, y, w, h], theme, 24, 31)}
  </g>`;
}

function renderTrustStack(theme, width, height) {
  const x = width * 0.57;
  const y = height * 0.16;
  const w = width * 0.28;
  const h = height * 0.56;
  const cx = x + w * 0.5;
  const cy = y + h * 0.46;
  return `<g>
    ${haloArc(x + w * 0.12, y + h * 0.1, w * 0.76, h * 0.54, theme, width)}
    ${modulePill(x + w * 0.08, y + h * 0.14, w * 0.18, h * 0.12, theme, "doc")}
    ${modulePill(x + w * 0.74, y + h * 0.14, w * 0.18, h * 0.12, theme, "shield")}
    ${modulePill(x + w * 0.36, y + h * 0.76, w * 0.28, h * 0.11, theme, "trail")}
    <path d="M ${x + w * 0.26} ${y + h * 0.2} C ${x + w * 0.36} ${y + h * 0.2}, ${x + w * 0.38} ${cy}, ${cx - w * 0.16} ${cy}" stroke="${theme.white}" stroke-width="${Math.max(2, width * 0.0016)}" fill="none" stroke-linecap="round"/>
    <path d="M ${x + w * 0.74} ${y + h * 0.2} C ${x + w * 0.66} ${y + h * 0.2}, ${x + w * 0.64} ${cy}, ${cx + w * 0.16} ${cy}" stroke="${theme.ember}" stroke-width="${Math.max(2, width * 0.0016)}" fill="none" stroke-linecap="round"/>
    <path d="M ${cx} ${cy + h * 0.11} L ${cx} ${y + h * 0.76}" stroke="${theme.white}" stroke-width="${Math.max(2, width * 0.0016)}" stroke-linecap="round"/>
    ${node(cx - w * 0.16, cy, theme.white, theme.accent, width)}
    ${node(cx + w * 0.16, cy, theme.ember, theme.ember, width)}
    ${node(cx, y + h * 0.76, theme.white, theme.accent, width)}
    ${carPod(x + w * 0.32, y + h * 0.34, w * 0.36, h * 0.22, theme, width)}
    ${particles(width, height, [x, y, w, h], theme, 20, 41)}
  </g>`;
}

function renderLearningOrbits(theme, width, height) {
  const x = width * 0.55;
  const y = height * 0.14;
  const w = width * 0.32;
  const h = height * 0.64;
  const cx = x + w * 0.62;
  const cy = y + h * 0.5;
  const rx = w * 0.24;
  const ry = h * 0.16;
  const angles = [20, 122, 216, 330];
  const nodes = angles.map((angle, index) => {
    const point = pointOnEllipse(cx, cy, rx * (index % 2 ? 1.24 : 0.96), ry * (index % 2 ? 1.2 : 0.96), index * 14, angle);
    return node(point.x, point.y, theme.white, index === 1 ? theme.ember : theme.accent, width);
  }).join("");
  return `<g>
    ${panel(x, y, w, h, theme)}
    <rect x="${x + w * 0.1}" y="${y + h * 0.74}" width="${w * 0.72}" height="${h * 0.1}" rx="${Math.max(16, width * 0.012)}" fill="${theme.card}" stroke="${theme.cardStroke}" stroke-width="${Math.max(1, width * 0.001)}"/>
    <rect x="${x + w * 0.16}" y="${y + h * 0.6}" width="${w * 0.56}" height="${h * 0.08}" rx="${Math.max(14, width * 0.01)}" fill="${theme.card}" stroke="${theme.cardStroke}" stroke-width="${Math.max(1, width * 0.001)}"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(14 ${cx} ${cy})" stroke="${theme.stroke}" stroke-width="${Math.max(2, width * 0.0016)}" fill="none"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx * 1.26}" ry="${ry * 1.24}" transform="rotate(-18 ${cx} ${cy})" stroke="${theme.emberSoft}" stroke-width="${Math.max(2, width * 0.0016)}" fill="none"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx * 1.54}" ry="${ry * 1.5}" transform="rotate(28 ${cx} ${cy})" stroke="${theme.soft}" stroke-width="${Math.max(2, width * 0.0016)}" fill="none"/>
    <path d="M ${x + w * 0.26} ${y + h * 0.78} C ${x + w * 0.36} ${y + h * 0.66}, ${x + w * 0.46} ${y + h * 0.58}, ${cx - w * 0.08} ${cy + h * 0.04}" stroke="${theme.stroke}" stroke-width="${Math.max(2, width * 0.0016)}" fill="none" stroke-linecap="round"/>
    <path d="M ${x + w * 0.34} ${y + h * 0.64} C ${x + w * 0.44} ${y + h * 0.56}, ${x + w * 0.52} ${y + h * 0.5}, ${cx - w * 0.02} ${cy}" stroke="${theme.emberSoft}" stroke-width="${Math.max(2, width * 0.0016)}" fill="none" stroke-linecap="round"/>
    ${nodes}
    ${node(cx, cy, theme.white, theme.ember, width)}
    ${particles(width, height, [x, y, w, h], theme, 24, 53)}
  </g>`;
}

function renderContextLoom(theme, width, height) {
  const x = width * 0.54;
  const y = height * 0.14;
  const w = width * 0.34;
  const h = height * 0.62;
  const spineX = x + w * 0.5;
  const inputs = [0.2, 0.38, 0.56, 0.74].map((r) => y + h * r);
  const outputs = [0.26, 0.5, 0.74].map((r) => y + h * r);
  const leftX = x + w * 0.04;
  const rightX = x + w * 0.7;
  const cards = [];
  inputs.forEach((cy, index) => {
    cards.push(card(leftX, cy - h * 0.05, w * 0.22, h * 0.1, theme));
    cards.push(`<path d="M ${leftX + w * 0.22} ${cy} C ${x + w * 0.34} ${cy}, ${x + w * 0.42} ${outputs[index % 3]}, ${spineX - w * 0.03} ${outputs[index % 3]}" stroke="${index % 2 === 0 ? theme.accent : theme.ember}" stroke-width="${Math.max(2.4, width * 0.0018)}" fill="none" stroke-linecap="round"/>`);
  });
  outputs.forEach((cy, index) => {
    cards.push(card(rightX, cy - h * 0.06, w * 0.22, h * 0.12, theme));
    cards.push(`<path d="M ${spineX + w * 0.03} ${cy} C ${x + w * 0.58} ${cy}, ${x + w * 0.64} ${cy}, ${rightX} ${cy}" stroke="${index === 1 ? theme.ember : theme.accent}" stroke-width="${Math.max(2.4, width * 0.0018)}" fill="none" stroke-linecap="round"/>`);
    cards.push(node(spineX, cy, theme.white, index === 1 ? theme.ember : theme.accent, width));
  });
  return `<g>${panel(x, y, w, h, theme)}<line x1="${spineX}" y1="${y + h * 0.1}" x2="${spineX}" y2="${y + h * 0.86}" stroke="${theme.stroke}" stroke-width="${Math.max(2.6, width * 0.0019)}"/>${cards.join("")}${particles(width, height, [x, y, w, h], theme, 20, 67)}</g>`;
}

function renderBuilderGeometry(theme, width, height) {
  const x = width * 0.57;
  const y = height * 0.18;
  const w = width * 0.28;
  const h = height * 0.56;
  const bars = [0.18, 0.34, 0.56, 0.8].map((ratio, index) => {
    const bw = w * 0.12;
    const bx = x + w * (0.08 + index * 0.18);
    const bh = h * ratio;
    const by = y + h - bh;
    return `
      <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${Math.max(16, width * 0.01)}" fill="${theme.card}" stroke="${theme.cardStroke}" stroke-width="${Math.max(1, width * 0.001)}"/>
      <rect x="${bx + bw * 0.18}" y="${by + bh * 0.16}" width="${bw * 0.64}" height="${Math.max(10, bh * 0.16)}" rx="${Math.max(8, width * 0.005)}" fill="${index === 3 ? theme.ember : theme.white}"/>
    `;
  }).join("");
  return `<g>
    ${panel(x, y, w, h, theme)}
    ${bars}
    <path d="M ${x + w * 0.08} ${y + h * 0.82} C ${x + w * 0.26} ${y + h * 0.72}, ${x + w * 0.46} ${y + h * 0.56}, ${x + w * 0.76} ${y + h * 0.22}" stroke="${theme.ember}" stroke-width="${Math.max(4, width * 0.003)}" fill="none" stroke-linecap="round"/>
    ${particles(width, height, [x, y, w, h], theme, 18, 79)}
  </g>`;
}

function renderExecutionBridge(theme, width, height) {
  const x = width * 0.55;
  const y = height * 0.18;
  const w = width * 0.32;
  const h = height * 0.54;
  const left = [
    card(x + w * 0.04, y + h * 0.14, w * 0.22, h * 0.14, theme),
    card(x + w * 0.04, y + h * 0.42, w * 0.22, h * 0.14, theme)
  ].join("");
  const right = [
    card(x + w * 0.74, y + h * 0.2, w * 0.22, h * 0.14, theme),
    card(x + w * 0.74, y + h * 0.48, w * 0.22, h * 0.14, theme)
  ].join("");
  return `<g>
    ${panel(x, y, w, h, theme)}
    ${left}
    ${right}
    <path d="M ${x + w * 0.26} ${y + h * 0.21} C ${x + w * 0.4} ${y + h * 0.21}, ${x + w * 0.44} ${y + h * 0.27}, ${x + w * 0.5} ${y + h * 0.27}" stroke="${theme.soft}" stroke-width="${Math.max(2.2, width * 0.0017)}" fill="none" stroke-linecap="round"/>
    <path d="M ${x + w * 0.5} ${y + h * 0.27} C ${x + w * 0.6} ${y + h * 0.27}, ${x + w * 0.64} ${y + h * 0.28}, ${x + w * 0.74} ${y + h * 0.28}" stroke="${theme.soft}" stroke-width="${Math.max(2.2, width * 0.0017)}" fill="none" stroke-linecap="round"/>
    <path d="M ${x + w * 0.26} ${y + h * 0.49} C ${x + w * 0.38} ${y + h * 0.49}, ${x + w * 0.42} ${y + h * 0.55}, ${x + w * 0.46} ${y + h * 0.55}" stroke="${theme.soft}" stroke-width="${Math.max(2.2, width * 0.0017)}" fill="none" stroke-linecap="round"/>
    <path d="M ${x + w * 0.54} ${y + h * 0.55} C ${x + w * 0.62} ${y + h * 0.55}, ${x + w * 0.67} ${y + h * 0.55}, ${x + w * 0.74} ${y + h * 0.55}" stroke="${theme.soft}" stroke-width="${Math.max(2.2, width * 0.0017)}" fill="none" stroke-linecap="round"/>
    <path d="M ${x + w * 0.46} ${y + h * 0.55} L ${x + w * 0.54} ${y + h * 0.55}" stroke="${theme.ember}" stroke-width="${Math.max(4.2, width * 0.003)}" fill="none" stroke-linecap="round" filter="url(#soft-glow)"/>
    ${node(x + w * 0.5, y + h * 0.55, theme.ember, theme.ember, width)}
    ${particles(width, height, [x, y, w, h], theme, 18, 89)}
  </g>`;
}

function renderExportArc(theme, width, height) {
  const x = width * 0.54;
  const y = height * 0.15;
  const w = width * 0.34;
  const h = height * 0.58;
  const originX = x + w * 0.18;
  const originY = y + h * 0.62;
  const targets = [
    [0.7, 0.18],
    [0.84, 0.34],
    [0.8, 0.6]
  ];
  const arcs = targets.map(([rx, ry], index) => {
    const tx = x + w * rx;
    const ty = y + h * ry;
    return `
      <path d="M ${originX} ${originY} C ${x + w * 0.38} ${originY - h * 0.28}, ${x + w * 0.52} ${ty}, ${tx} ${ty}" stroke="${index === 1 ? theme.ember : theme.accent}" stroke-width="${Math.max(2.6, width * 0.0019)}" fill="none" stroke-linecap="round"/>
      ${node(tx, ty, theme.white, index === 1 ? theme.ember : theme.accent, width)}
    `;
  }).join("");
  return `<g>
    ${panel(x, y, w, h, theme)}
    <path d="M ${originX - w * 0.08} ${originY + h * 0.1} C ${originX - w * 0.03} ${originY + h * 0.02}, ${originX + w * 0.02} ${originY - h * 0.06}, ${originX + w * 0.02} ${originY - h * 0.14}" stroke="${theme.stroke}" stroke-width="${Math.max(3, width * 0.0022)}" fill="none" stroke-linecap="round"/>
    <path d="M ${originX - w * 0.05} ${originY + h * 0.04} C ${originX + w * 0.01} ${originY - h * 0.01}, ${originX + w * 0.06} ${originY - h * 0.05}, ${originX + w * 0.08} ${originY - h * 0.12}" stroke="${theme.stroke}" stroke-width="${Math.max(3, width * 0.0022)}" fill="none" stroke-linecap="round"/>
    ${node(originX, originY, theme.white, theme.ember, width)}
    ${arcs}
    ${particles(width, height, [x, y, w, h], theme, 20, 97)}
  </g>`;
}

function renderVigilanceField(theme, width, height) {
  const x = width * 0.58;
  const y = height * 0.16;
  const w = width * 0.26;
  const h = height * 0.58;
  const cx = x + w * 0.48;
  const cy = y + h * 0.48;
  const rings = [0.22, 0.36, 0.5].map((ratio, index) => `<ellipse cx="${cx}" cy="${cy}" rx="${w * ratio}" ry="${h * ratio * 0.74}" stroke="${index === 1 ? theme.emberSoft : theme.stroke}" stroke-width="${Math.max(2.2, width * 0.0017)}" fill="none" transform="rotate(${index * 12 - 6} ${cx} ${cy})"/>`).join("");
  const sparks = [];
  const rng = mulberry32(113);
  for (let i = 0; i < 36; i += 1) {
    const sx = x + w * (0.62 + rng() * 0.5);
    const sy = y + h * (rng() * 1.1);
    const fill = i % 5 === 0 ? theme.ember : theme.white;
    sparks.push(`<circle cx="${sx.toFixed(2)}" cy="${sy.toFixed(2)}" r="${(1.2 + rng() * width * 0.0018).toFixed(2)}" fill="${fill}" opacity="${i % 5 === 0 ? "0.78" : "0.66"}"/>`);
  }
  return `<g>
    ${rings}
    <path d="M ${x + w * 0.08} ${cy + h * 0.18} C ${x + w * 0.18} ${cy - h * 0.08}, ${x + w * 0.34} ${cy - h * 0.18}, ${x + w * 0.56} ${cy - h * 0.12}" stroke="${theme.white}" stroke-width="${Math.max(3.4, width * 0.0026)}" fill="none" stroke-linecap="round" filter="url(#soft-glow)"/>
    ${node(cx, cy, theme.white, theme.ember, width)}
    <g filter="url(#fine-glow)">${sparks.join("")}</g>
  </g>`;
}

function renderDesireOrbits(theme, width, height) {
  const x = width * 0.57;
  const y = height * 0.16;
  const w = width * 0.28;
  const h = height * 0.56;
  const cx = x + w * 0.46;
  const cy = y + h * 0.52;
  const targetX = x + w * 0.84;
  const targetY = y + h * 0.24;
  return `<g>
    <ellipse cx="${cx}" cy="${cy}" rx="${w * 0.24}" ry="${h * 0.16}" transform="rotate(18 ${cx} ${cy})" stroke="${theme.soft}" stroke-width="${Math.max(2, width * 0.0016)}" fill="none"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${w * 0.34}" ry="${h * 0.24}" transform="rotate(-14 ${cx} ${cy})" stroke="${theme.soft}" stroke-width="${Math.max(2, width * 0.0016)}" fill="none"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${w * 0.46}" ry="${h * 0.3}" transform="rotate(24 ${cx} ${cy})" stroke="${theme.emberSoft}" stroke-width="${Math.max(2, width * 0.0016)}" fill="none"/>
    <path d="M ${cx} ${cy} C ${cx + w * 0.16} ${cy - h * 0.1}, ${cx + w * 0.26} ${cy - h * 0.22}, ${targetX} ${targetY}" stroke="${theme.ember}" stroke-width="${Math.max(3.4, width * 0.0026)}" fill="none" stroke-linecap="round"/>
    ${node(cx, cy, theme.white, theme.accent, width)}
    ${node(targetX, targetY, theme.white, theme.ember, width)}
    ${node(x + w * 0.16, y + h * 0.34, theme.white, theme.white, width)}
    ${node(x + w * 0.7, y + h * 0.72, theme.white, theme.white, width)}
    ${particles(width, height, [x, y, w, h], theme, 24, 131)}
  </g>`;
}

function renderCircumstanceLenses(theme, width, height) {
  const x = width * 0.54;
  const y = height * 0.14;
  const w = width * 0.34;
  const h = height * 0.62;
  const left = lens(x + w * 0.12, y + h * 0.16, w * 0.28, h * 0.42, theme, "cool", width);
  const right = lens(x + w * 0.56, y + h * 0.16, w * 0.28, h * 0.42, theme, "warm", width);
  return `<g>
    ${left}
    ${right}
    <path d="M ${x + w * 0.24} ${y + h * 0.72} C ${x + w * 0.38} ${y + h * 0.56}, ${x + w * 0.48} ${y + h * 0.52}, ${x + w * 0.64} ${y + h * 0.72}" stroke="${theme.stroke}" stroke-width="${Math.max(3, width * 0.0022)}" fill="none" stroke-linecap="round"/>
    ${node(x + w * 0.44, y + h * 0.54, theme.white, theme.accent, width)}
    ${node(x + w * 0.54, y + h * 0.54, theme.white, theme.ember, width)}
    ${particles(width, height, [x, y, w, h], theme, 22, 149)}
  </g>`;
}

function panel(x, y, w, h, theme) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.max(22, w * 0.06)}" fill="${theme.card}" stroke="${theme.cardStroke}" stroke-width="${Math.max(1, w * 0.0038)}"/>`;
}

function gridBox(x, y, w, h, theme, cols, rows) {
  const lines = [];
  for (let i = 0; i <= cols; i += 1) {
    const gx = x + (w * i) / cols;
    lines.push(`<line x1="${gx}" y1="${y}" x2="${gx}" y2="${y + h}" stroke="${theme.grid}" stroke-width="1"/>`);
  }
  for (let i = 0; i <= rows; i += 1) {
    const gy = y + (h * i) / rows;
    lines.push(`<line x1="${x}" y1="${gy}" x2="${x + w}" y2="${gy}" stroke="${theme.grid}" stroke-width="1"/>`);
  }
  return `<g>${lines.join("")}</g>`;
}

function haloArc(x, y, w, h, theme, width) {
  return `<path d="M ${x} ${y + h} C ${x} ${y + h * 0.18}, ${x + w} ${y + h * 0.18}, ${x + w} ${y + h}" stroke="${theme.stroke}" stroke-width="${Math.max(2.4, width * 0.0018)}" stroke-linecap="round" fill="none" filter="url(#soft-glow)"/>`;
}

function card(x, y, w, h, theme) {
  const bodyFill = theme.mode === "dark" ? "rgba(255,255,255,0.18)" : "rgba(22,22,22,0.08)";
  const bodyFillSoft = theme.mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(22,22,22,0.06)";
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.max(12, w * 0.08)}" fill="${theme.card}" stroke="${theme.cardStroke}" stroke-width="${Math.max(1, w * 0.004)}"/>
    <rect x="${x + w * 0.1}" y="${y + h * 0.2}" width="${w * 0.22}" height="${h * 0.12}" rx="${Math.max(6, h * 0.06)}" fill="${theme.accentSoft}"/>
    <rect x="${x + w * 0.1}" y="${y + h * 0.44}" width="${w * 0.5}" height="${h * 0.1}" rx="${Math.max(6, h * 0.05)}" fill="${bodyFill}"/>
    <rect x="${x + w * 0.1}" y="${y + h * 0.64}" width="${w * 0.36}" height="${h * 0.08}" rx="${Math.max(6, h * 0.05)}" fill="${bodyFillSoft}"/>
  `;
}

function modulePill(x, y, w, h, theme, kind) {
  let body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.max(14, h * 0.45)}" fill="${theme.card}" stroke="${theme.cardStroke}" stroke-width="${Math.max(1, w * 0.004)}"/>`;
  if (kind === "doc") {
    body += `<rect x="${x + w * 0.12}" y="${y + h * 0.26}" width="${w * 0.2}" height="${h * 0.12}" rx="${Math.max(4, h * 0.06)}" fill="${theme.emberSoft}"/>
      <rect x="${x + w * 0.12}" y="${y + h * 0.48}" width="${w * 0.46}" height="${h * 0.08}" rx="${Math.max(4, h * 0.04)}" fill="${theme.soft}"/>
      <circle cx="${x + w * 0.8}" cy="${y + h * 0.5}" r="${Math.max(5, h * 0.14)}" fill="${theme.ember}"/>`;
  } else if (kind === "shield") {
    body += `<path d="M ${x + w * 0.52} ${y + h * 0.26} L ${x + w * 0.66} ${y + h * 0.34} L ${x + w * 0.63} ${y + h * 0.54} C ${x + w * 0.6} ${y + h * 0.68}, ${x + w * 0.54} ${y + h * 0.78}, ${x + w * 0.48} ${y + h * 0.84} C ${x + w * 0.42} ${y + h * 0.78}, ${x + w * 0.36} ${y + h * 0.68}, ${x + w * 0.33} ${y + h * 0.54} L ${x + w * 0.3} ${y + h * 0.34} Z" fill="none" stroke="${theme.white}" stroke-width="${Math.max(1.6, w * 0.01)}"/>`;
  } else {
    body += `<path d="M ${x + w * 0.18} ${y + h * 0.6} L ${x + w * 0.34} ${y + h * 0.44} L ${x + w * 0.5} ${y + h * 0.58} L ${x + w * 0.72} ${y + h * 0.38}" stroke="${theme.white}" stroke-width="${Math.max(1.8, w * 0.012)}" fill="none" stroke-linecap="round"/><circle cx="${x + w * 0.18}" cy="${y + h * 0.6}" r="${Math.max(4, h * 0.12)}" fill="${theme.white}"/><circle cx="${x + w * 0.72}" cy="${y + h * 0.38}" r="${Math.max(4, h * 0.12)}" fill="${theme.white}"/>`;
  }
  return `<g>${body}</g>`;
}

function carPod(x, y, w, h, theme, width) {
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.max(18, w * 0.08)}" fill="${theme.white}" stroke="${theme.cardStroke}" stroke-width="${Math.max(1.2, width * 0.0012)}"/>
    <rect x="${x + w * 0.14}" y="${y + h * 0.14}" width="${w * 0.22}" height="${h * 0.1}" rx="${Math.max(5, h * 0.06)}" fill="${theme.accentSoft}"/>
    <path d="M ${x + w * 0.22} ${y + h * 0.56} C ${x + w * 0.28} ${y + h * 0.42}, ${x + w * 0.38} ${y + h * 0.34}, ${x + w * 0.46} ${y + h * 0.34} L ${x + w * 0.62} ${y + h * 0.34} C ${x + w * 0.72} ${y + h * 0.34}, ${x + w * 0.82} ${y + h * 0.44}, ${x + w * 0.88} ${y + h * 0.56} L ${x + w * 0.88} ${y + h * 0.6} L ${x + w * 0.22} ${y + h * 0.6} Z" fill="none" stroke="${theme.accent}" stroke-width="${Math.max(2.2, width * 0.0018)}" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${x + w * 0.34}" cy="${y + h * 0.6}" r="${Math.max(4.6, width * 0.0032)}" fill="${theme.accent}"/>
    <circle cx="${x + w * 0.74}" cy="${y + h * 0.6}" r="${Math.max(4.6, width * 0.0032)}" fill="${theme.accent}"/>
    <rect x="${x + w * 0.18}" y="${y + h * 0.76}" width="${w * 0.64}" height="${h * 0.08}" rx="${Math.max(6, h * 0.04)}" fill="${theme.ember}"/>
  </g>`;
}

function battery(x, y, w, h, theme, width) {
  const bars = [];
  for (let i = 0; i < 4; i += 1) {
    bars.push(`<rect x="${x + w * 0.18}" y="${y + h * (0.14 + i * 0.18)}" width="${w * 0.52}" height="${h * 0.1}" rx="${Math.max(6, h * 0.04)}" fill="${i < 3 ? theme.accent : theme.emberSoft}"/>`);
  }
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.max(16, w * 0.09)}" fill="${theme.card}" stroke="${theme.cardStroke}" stroke-width="${Math.max(1.2, width * 0.0012)}"/>
    <rect x="${x + w * 0.36}" y="${y - h * 0.08}" width="${w * 0.18}" height="${h * 0.06}" rx="${Math.max(4, h * 0.03)}" fill="${theme.accent}"/>
    ${bars.join("")}
  </g>`;
}

function lens(x, y, w, h, theme, mode, width) {
  const accent = mode === "warm" ? theme.ember : theme.accent;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.max(16, w * 0.08)}" fill="${theme.card}" stroke="${theme.cardStroke}" stroke-width="${Math.max(1.2, width * 0.0012)}"/>
    <ellipse cx="${x + w * 0.5}" cy="${y + h * 0.42}" rx="${w * 0.3}" ry="${h * 0.24}" fill="${mode === "warm" ? theme.emberSoft : theme.soft}"/>
    <path d="M ${x + w * 0.2} ${y + h * 0.74} C ${x + w * 0.34} ${y + h * 0.52}, ${x + w * 0.46} ${y + h * 0.36}, ${x + w * 0.66} ${y + h * 0.24}" stroke="${accent}" stroke-width="${Math.max(2.4, width * 0.0018)}" fill="none" stroke-linecap="round"/>
    ${node(x + w * 0.68, y + h * 0.24, theme.white, accent, width)}
  </g>`;
}

function node(x, y, outer, inner, width) {
  return `<g filter="url(#fine-glow)"><circle cx="${x}" cy="${y}" r="${Math.max(7, width * 0.0046)}" fill="${outer}"/><circle cx="${x}" cy="${y}" r="${Math.max(3.1, width * 0.0023)}" fill="${inner}"/></g>`;
}

function dot(x, y, r, fill) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
}

function particles(width, height, region, theme, count, seed) {
  const [x0, y0, w, h] = region;
  const rng = mulberry32(seed + width + height);
  const colors = [theme.soft, theme.emberSoft, theme.grid];
  const dots = [];
  for (let i = 0; i < count; i += 1) {
    const x = x0 + rng() * w;
    const y = y0 + rng() * h;
    const r = 0.8 + rng() * width * 0.0018;
    dots.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="${colors[Math.floor(rng() * colors.length)]}"/>`);
  }
  return `<g filter="url(#fine-glow)">${dots.join("")}</g>`;
}

function pointOnEllipse(cx, cy, rx, ry, rotationDeg, angleDeg) {
  const t = (angleDeg * Math.PI) / 180;
  const r = (rotationDeg * Math.PI) / 180;
  const ex = rx * Math.cos(t);
  const ey = ry * Math.sin(t);
  return {
    x: cx + ex * Math.cos(r) - ey * Math.sin(r),
    y: cy + ex * Math.sin(r) + ey * Math.cos(r)
  };
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
