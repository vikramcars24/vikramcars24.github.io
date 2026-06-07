import { promises as fs } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rootDir = process.cwd();
const mediaDir = path.join(rootDir, "src", "media");
const width = 1672;
const height = 941;

await fs.mkdir(mediaDir, { recursive: true });

const variants = [
  {
    name: "technical",
    svg: renderTechnicalVariant()
  },
  {
    name: "editorial",
    svg: renderEditorialVariant()
  }
];

for (const variant of variants) {
  const svgPath = path.join(mediaDir, `ai-native-is-not-ai-first-${variant.name}-exploration.svg`);
  const pngPath = path.join(mediaDir, `ai-native-is-not-ai-first-${variant.name}-exploration.png`);
  await fs.writeFile(svgPath, variant.svg, "utf8");
  execFileSync("sips", ["-s", "format", "png", svgPath, "--out", pngPath], { stdio: "ignore" });
}

console.log("Generated AI-native exploration images.");

function renderTechnicalVariant() {
  const cards = [];
  const inputs = [120, 230, 340, 450, 560];
  const routers = [250, 430, 610];
  const outputs = [220, 400, 580];

  for (const y of inputs) {
    cards.push(panel(120, y, 280, 92, y % 220 === 0));
  }
  for (const y of outputs) {
    cards.push(panel(1110, y, 330, 110, y === 400));
  }

  const lines = [];
  inputs.forEach((y, index) => {
    const target = routers[index % routers.length];
    lines.push(curve(400, y + 46, 595, y + 46, 675, target, 820, target, index % 2 === 0 ? "#5d52ff" : "#ef6b50"));
  });
  outputs.forEach((y, index) => {
    const source = routers[index];
    lines.push(curve(852, source, 970, source, 1030, y + 55, 1110, y + 55, index === 1 ? "#ef6b50" : "#5d52ff"));
  });

  const routerNodes = routers
    .map((y, index) => `
      <g>
        <circle cx="836" cy="${y}" r="25" fill="#fffdfa" stroke="rgba(93,82,255,0.28)" stroke-width="3"/>
        <circle cx="836" cy="${y}" r="7" fill="${index === 1 ? "#ef6b50" : "#5d52ff"}"/>
      </g>
    `)
    .join("");

  const rails = [238, 416, 594].map((y) => `<line x1="84" y1="${y}" x2="1520" y2="${y}" stroke="rgba(93,82,255,0.08)" stroke-width="2"/>`).join("");
  const columns = [180, 380, 580, 780, 980, 1180, 1380].map((x) => `<line x1="${x}" y1="96" x2="${x}" y2="844" stroke="rgba(93,82,255,0.06)" stroke-width="2"/>`).join("");

  return baseSvg(`
    <rect width="${width}" height="${height}" fill="#efedff"/>
    <rect x="84" y="96" width="1504" height="748" rx="28" fill="rgba(255,255,255,0.24)" stroke="rgba(93,82,255,0.08)" stroke-width="2"/>
    <ellipse cx="1300" cy="210" rx="310" ry="210" fill="rgba(93,82,255,0.06)"/>
    <ellipse cx="180" cy="770" rx="300" ry="180" fill="rgba(239,107,80,0.04)"/>
    ${rails}
    ${columns}
    <line x1="836" y1="166" x2="836" y2="700" stroke="rgba(93,82,255,0.24)" stroke-width="4"/>
    ${cards.join("")}
    ${lines.join("")}
    ${routerNodes}
    <rect x="120" y="72" width="184" height="10" rx="5" fill="#4d48ff"/>
    <rect x="1400" y="820" width="136" height="10" rx="5" fill="#ef5d43"/>
  `);
}

function renderEditorialVariant() {
  const verticals = [0.18, 0.38, 0.58, 0.78].map((ratio) => {
    const x = width * ratio;
    return `<line x1="${x}" y1="120" x2="${x}" y2="820" stroke="rgba(93,82,255,0.08)" stroke-width="2"/>`;
  }).join("");

  const horizontals = [0.22, 0.38, 0.54, 0.7].map((ratio) => {
    const y = height * ratio;
    return `<line x1="140" y1="${y}" x2="1512" y2="${y}" stroke="rgba(93,82,255,0.06)" stroke-width="2"/>`;
  }).join("");

  const documents = [
    panel(270, 198, 310, 112, false),
    panel(382, 358, 330, 118, true),
    panel(970, 236, 320, 126, false),
    panel(1090, 432, 280, 104, false),
    panel(900, 612, 350, 108, true)
  ].join("");

  const pathways = `
    ${curve(580, 252, 690, 252, 730, 252, 836, 252, "#5d52ff")}
    ${curve(712, 418, 770, 418, 795, 418, 836, 418, "#ef6b50")}
    ${curve(836, 252, 890, 252, 920, 300, 970, 300, "#5d52ff")}
    ${curve(836, 418, 930, 418, 972, 484, 1090, 484, "#ef6b50")}
    ${curve(836, 418, 886, 418, 876, 666, 900, 666, "#5d52ff")}
    ${curve(468, 476, 610, 520, 690, 620, 836, 666, "#ef6b50")}
  `;

  const nodes = `
    <circle cx="836" cy="252" r="24" fill="#fffdfa" stroke="rgba(93,82,255,0.24)" stroke-width="3"/>
    <circle cx="836" cy="252" r="7" fill="#5d52ff"/>
    <circle cx="836" cy="418" r="24" fill="#fffdfa" stroke="rgba(93,82,255,0.24)" stroke-width="3"/>
    <circle cx="836" cy="418" r="7" fill="#ef6b50"/>
    <circle cx="836" cy="666" r="24" fill="#fffdfa" stroke="rgba(93,82,255,0.24)" stroke-width="3"/>
    <circle cx="836" cy="666" r="7" fill="#5d52ff"/>
  `;

  return baseSvg(`
    <rect width="${width}" height="${height}" fill="#f4f2ff"/>
    <rect x="140" y="120" width="1372" height="700" rx="34" fill="rgba(255,255,255,0.3)" stroke="rgba(93,82,255,0.08)" stroke-width="2"/>
    <ellipse cx="1330" cy="222" rx="270" ry="190" fill="rgba(93,82,255,0.05)"/>
    <ellipse cx="242" cy="740" rx="270" ry="170" fill="rgba(239,107,80,0.04)"/>
    ${verticals}
    ${horizontals}
    <rect x="168" y="82" width="160" height="9" rx="4.5" fill="#544eff"/>
    <rect x="1380" y="804" width="126" height="9" rx="4.5" fill="#ef5d43"/>
    <line x1="836" y1="176" x2="836" y2="748" stroke="rgba(93,82,255,0.22)" stroke-width="4"/>
    ${documents}
    ${pathways}
    ${nodes}
  `);
}

function panel(x, y, w, h, warm) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="rgba(255,255,255,0.95)" stroke="rgba(93,82,255,0.18)" stroke-width="2"/>
      <rect x="${x + 20}" y="${y + 18}" width="${w * 0.25}" height="12" rx="6" fill="${warm ? "rgba(239,107,80,0.16)" : "rgba(93,82,255,0.16)"}"/>
      <rect x="${x + 20}" y="${y + 44}" width="${w * 0.52}" height="10" rx="5" fill="rgba(22,22,22,0.08)"/>
      <rect x="${x + 20}" y="${y + 64}" width="${w * 0.4}" height="9" rx="4.5" fill="rgba(22,22,22,0.05)"/>
    </g>
  `;
}

function curve(x1, y1, c1x, c1y, c2x, c2y, x2, y2, stroke) {
  return `<path d="M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}" stroke="${stroke}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.52"/>`;
}

function baseSvg(inner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
${inner}
</svg>`;
}
