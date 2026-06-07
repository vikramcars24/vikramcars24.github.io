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
    name: "pinball",
    svg: renderPinballVariant()
  },
  {
    name: "subway",
    svg: renderSubwayVariant()
  }
];

for (const variant of variants) {
  const svgPath = path.join(mediaDir, `ai-native-is-not-ai-first-${variant.name}-exploration.svg`);
  const pngPath = path.join(mediaDir, `ai-native-is-not-ai-first-${variant.name}-exploration.png`);
  await fs.writeFile(svgPath, variant.svg, "utf8");
  execFileSync("sips", ["-s", "format", "png", svgPath, "--out", pngPath], { stdio: "ignore" });
}

console.log("Generated AI-native exploration images.");

function renderPinballVariant() {
  const bumpers = [
    [530, 270, 52, "#5d52ff"],
    [760, 390, 48, "#ef6b50"],
    [1020, 280, 50, "#5d52ff"],
    [900, 540, 56, "#ef6b50"],
    [620, 610, 46, "#5d52ff"]
  ];

  const gates = `
    <rect x="1110" y="188" width="250" height="104" rx="18" fill="rgba(255,255,255,0.92)" stroke="rgba(93,82,255,0.18)" stroke-width="3"/>
    <rect x="1140" y="222" width="110" height="10" rx="5" fill="rgba(93,82,255,0.16)"/>
    <rect x="1140" y="246" width="150" height="9" rx="4.5" fill="rgba(22,22,22,0.08)"/>
    <rect x="1184" y="410" width="190" height="22" rx="11" fill="rgba(255,255,255,0.94)" stroke="rgba(93,82,255,0.18)" stroke-width="3"/>
    <rect x="1108" y="578" width="280" height="112" rx="18" fill="rgba(255,255,255,0.92)" stroke="rgba(93,82,255,0.18)" stroke-width="3"/>
    <rect x="1138" y="610" width="96" height="10" rx="5" fill="rgba(239,107,80,0.16)"/>
    <rect x="1138" y="634" width="162" height="9" rx="4.5" fill="rgba(22,22,22,0.08)"/>
  `;

  const laneLines = `
    <path d="M 250 176 C 520 184, 650 244, 812 280 C 944 308, 1042 298, 1176 252" stroke="rgba(93,82,255,0.5)" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M 242 276 C 430 304, 528 364, 714 408 C 850 440, 1012 444, 1188 420" stroke="rgba(239,107,80,0.48)" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M 246 420 C 452 430, 592 528, 774 566 C 922 598, 1036 590, 1180 548" stroke="rgba(93,82,255,0.5)" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M 260 618 C 430 612, 570 530, 704 470 C 884 390, 1036 346, 1174 346" stroke="rgba(239,107,80,0.44)" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M 1226 166 L 1374 284" stroke="rgba(93,82,255,0.22)" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M 1238 742 L 1396 742" stroke="rgba(93,82,255,0.26)" stroke-width="12" fill="none" stroke-linecap="round"/>
  `;

  const fastLane = `
    <path d="M 132 128 C 180 120, 248 120, 302 128 C 404 144, 420 212, 516 224 C 608 238, 664 180, 754 194 C 836 206, 858 278, 944 294 C 1014 308, 1090 282, 1194 198 C 1264 142, 1330 124, 1450 128"
      stroke="rgba(255,255,255,0.96)" stroke-width="12" fill="none" stroke-linecap="round" filter="url(#softGlow)"/>
    <path d="M 132 128 C 180 120, 248 120, 302 128 C 404 144, 420 212, 516 224 C 608 238, 664 180, 754 194 C 836 206, 858 278, 944 294 C 1014 308, 1090 282, 1194 198 C 1264 142, 1330 124, 1450 128"
      stroke="rgba(93,82,255,0.85)" stroke-width="5" fill="none" stroke-linecap="round"/>
  `;

  const flippers = `
    <path d="M 510 748 Q 610 714 698 674" stroke="rgba(93,82,255,0.34)" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="M 1162 748 Q 1062 714 974 674" stroke="rgba(239,107,80,0.3)" stroke-width="20" fill="none" stroke-linecap="round"/>
  `;

  const balls = `
    <circle cx="246" cy="126" r="15" fill="#ffffff" stroke="rgba(93,82,255,0.3)" stroke-width="4"/>
    <circle cx="246" cy="126" r="5" fill="#5d52ff"/>
    <circle cx="1248" cy="196" r="12" fill="#ffffff" stroke="rgba(93,82,255,0.24)" stroke-width="3"/>
  `;

  return baseSvg(`
    <defs>${sharedDefs()}</defs>
    <rect width="${width}" height="${height}" fill="#f1efff"/>
    <rect x="78" y="92" width="1516" height="756" rx="36" fill="rgba(255,255,255,0.26)" stroke="rgba(93,82,255,0.08)" stroke-width="3"/>
    <ellipse cx="1340" cy="182" rx="310" ry="206" fill="rgba(93,82,255,0.06)"/>
    <ellipse cx="184" cy="774" rx="300" ry="176" fill="rgba(239,107,80,0.04)"/>
    <path d="M 210 160 L 210 720 Q 212 792 276 792 L 1398 792 Q 1476 792 1476 716 L 1476 184 Q 1476 124 1418 124 L 278 124 Q 222 124 210 160 Z" fill="none" stroke="rgba(93,82,255,0.12)" stroke-width="4"/>
    <path d="M 274 124 L 408 124" stroke="rgba(93,82,255,0.3)" stroke-width="8" fill="none" stroke-linecap="round"/>
    ${laneLines}
    ${fastLane}
    ${gates}
    ${bumpers.map(([cx, cy, r, color]) => bumper(cx, cy, r, color)).join("")}
    ${flippers}
    ${balls}
    <rect x="1422" y="816" width="132" height="10" rx="5" fill="#ef5d43"/>
  `);
}

function renderSubwayVariant() {
  const mapFrame = `
    <rect x="138" y="120" width="1372" height="700" rx="34" fill="rgba(255,255,255,0.3)" stroke="rgba(93,82,255,0.08)" stroke-width="2"/>
    <ellipse cx="1330" cy="222" rx="270" ry="190" fill="rgba(93,82,255,0.05)"/>
    <ellipse cx="242" cy="740" rx="270" ry="170" fill="rgba(239,107,80,0.04)"/>
  `;

  const lines = `
    <path d="M 260 252 C 356 252, 442 252, 546 252 C 642 252, 702 252, 836 252 C 972 252, 1040 300, 1168 300 C 1260 300, 1320 300, 1410 300"
      stroke="rgba(93,82,255,0.62)" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M 382 418 C 462 418, 562 418, 696 418 C 770 418, 802 418, 836 418 C 920 418, 972 484, 1090 484 C 1200 484, 1288 484, 1360 484"
      stroke="rgba(239,107,80,0.58)" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M 468 476 C 530 520, 610 570, 704 620 C 766 654, 802 666, 836 666 C 916 666, 922 622, 968 622 C 1042 622, 1102 666, 1248 666"
      stroke="rgba(239,107,80,0.48)" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M 836 176 C 836 252, 836 330, 836 418 C 836 508, 836 574, 836 748"
      stroke="rgba(93,82,255,0.36)" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M 836 418 C 868 418, 888 418, 888 452 C 888 522, 884 610, 900 666"
      stroke="rgba(93,82,255,0.5)" stroke-width="6" fill="none" stroke-linecap="round"/>
  `;

  const nodes = [
    [260, 252], [546, 252], [836, 252], [1168, 300], [1410, 300],
    [382, 418], [696, 418], [836, 418], [1090, 484], [1360, 484],
    [468, 476], [836, 666], [900, 666], [1248, 666]
  ].map(([cx, cy], index) => station(cx, cy, index === 7 ? "#ef6b50" : "#5d52ff")).join("");

  const labels = `
    ${mapLabel(250, 198, "signal")}
    ${mapLabel(976, 236, "truth")}
    ${mapLabel(1100, 432, "agency")}
    ${mapLabel(912, 612, "decisions")}
    ${mapLabel(384, 358, "handoffs")}
  `;

  return baseSvg(`
    <defs>${sharedDefs()}</defs>
    <rect width="${width}" height="${height}" fill="#f4f2ff"/>
    ${mapFrame}
    <rect x="168" y="82" width="160" height="9" rx="4.5" fill="#544eff"/>
    <rect x="1380" y="804" width="126" height="9" rx="4.5" fill="#ef5d43"/>
    ${lines}
    ${nodes}
    ${labels}
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

function sharedDefs() {
  return `
    <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  `;
}

function bumper(cx, cy, r, color) {
  return `
    <g filter="url(#softGlow)">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,0.95)" stroke="${color}" stroke-width="5"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.46}" fill="${color}" opacity="0.18"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.14}" fill="${color}"/>
    </g>
  `;
}

function station(cx, cy, color) {
  return `
    <g>
      <circle cx="${cx}" cy="${cy}" r="13" fill="#fffdfa" stroke="${color}" stroke-width="5"/>
      <circle cx="${cx}" cy="${cy}" r="4.5" fill="${color}"/>
    </g>
  `;
}

function mapLabel(x, y, text) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${82 + text.length * 4}" height="32" rx="16" fill="rgba(255,255,255,0.92)" stroke="rgba(93,82,255,0.14)" stroke-width="2"/>
      <text x="${x + 18}" y="${y + 21}" fill="rgba(37,32,92,0.72)" font-size="15" font-family="'Avenir Next','Helvetica Neue',Arial,sans-serif" font-weight="600">${text}</text>
    </g>
  `;
}
