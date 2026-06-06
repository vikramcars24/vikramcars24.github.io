import { promises as fs } from "node:fs";
import path from "node:path";

const pageWidth = 612;
const pageHeight = 792;
const marginX = 68;
const topY = 690;
const bottomY = 72;
const contentWidth = 470;
const colors = {
  cream: [0.97, 0.95, 0.9],
  paleBlue: [0.9, 0.93, 1],
  paleYellow: [0.98, 0.84, 0.28],
  navy: [0.1, 0.15, 0.25],
  blue: [0.2, 0.35, 1],
  lightBlue: [0.73, 0.81, 0.98],
  softYellow: [0.97, 0.9, 0.6],
  grayBlue: [0.35, 0.4, 0.5],
  body: [0.07, 0.09, 0.12]
};

const draftPath = path.join(process.cwd(), "notes", "flatland-v3-full-draft.md");
const outputPath = path.join(process.cwd(), "notes", "flatland-v3.pdf");

async function main() {
  const raw = await fs.readFile(draftPath, "utf8");
  const pages = parsePages(raw);
  const pdf = buildPdf(pages);
  await fs.writeFile(outputPath, pdf);
  console.log(`Rendered ${pages.length} page(s) to ${outputPath}`);
}

function parsePages(raw) {
  const sections = raw
    .split(/^## /m)
    .slice(1)
    .map((section) => {
      const [headingLine, ...rest] = section.split("\n");
      return {
        heading: headingLine.trim(),
        body: rest.join("\n").trim()
      };
    });

  return sections.map((section) => {
    const title = section.heading.replace(/^Page\s+\d+\s+·\s+/, "").trim();

    if (title.includes("Cover")) {
      return { kind: "cover", title, blocks: parseParagraphBlocks(section.body) };
    }

    if (title.includes("Divider")) {
      return { kind: "divider", title, blocks: parseParagraphBlocks(section.body) };
    }

    const blocks = parseParagraphBlocks(section.body);
    let pageTitle = "";

    if (blocks[0]?.startsWith("### ")) {
      pageTitle = blocks.shift().replace(/^### /, "").trim();
    }

    return { kind: "body", title, pageTitle, blocks };
  });
}

function parseParagraphBlocks(body) {
  return body
    .split(/\n\s*\n/g)
    .map((block) => block.replace(/\n+/g, " ").trim())
    .filter(Boolean);
}

function buildPdf(pages) {
  const objects = [null];
  const reserve = () => {
    objects.push(null);
    return objects.length - 1;
  };
  const addObject = (content) => {
    objects.push(content);
    return objects.length - 1;
  };

  const catalogId = reserve();
  const pagesId = reserve();

  const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const fontItalicId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>");
  const fontMonoId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>");
  const fontSerifId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>");
  const fontSerifBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>");
  const fontSerifItalicId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>");

  const pageIds = [];

  for (let index = 0; index < pages.length; index += 1) {
    const stream = renderPage(pages[index], index + 1, pages.length);
    const contentId = addObject(
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`
    );
    const pageId = addObject(
      [
        "<< /Type /Page",
        `/Parent ${pagesId} 0 R`,
        `/MediaBox [0 0 ${pageWidth} ${pageHeight}]`,
        ` /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontItalicId} 0 R /F4 ${fontMonoId} 0 R /F5 ${fontSerifId} 0 R /F6 ${fontSerifBoldId} 0 R /F7 ${fontSerifItalicId} 0 R >> >>`,
        `/Contents ${contentId} 0 R`,
        ">>"
      ].join(" ")
    );
    pageIds.push(pageId);
  }

  objects[pagesId] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

  return serializePdf(objects);
}

function renderPage(page, pageNumber) {
  const commands = [];

  if (page.kind === "cover") {
    paintBackground(commands, colors.cream);
    renderCover(commands, page);
  } else if (page.kind === "divider") {
    paintBackground(commands, colors.paleBlue);
    renderDivider(commands, page, pageNumber);
  } else if (page.title === "Closing") {
    paintBackground(commands, colors.paleYellow);
    renderClosing(commands, page, pageNumber);
  } else {
    paintBackground(commands, colors.cream);
    renderBody(commands, page, pageNumber);
  }

  return commands.join("\n");
}

function renderCover(commands, page) {
  const blocks = page.blocks.map(stripEmphasisMarkers);
  drawText(commands, "CARS24 · 2026", 76, 650, { font: "F4", size: 10, color: colors.blue });
  drawText(commands, "A CULTURE BOOK", 76, 628, { font: "F4", size: 10, color: colors.navy });
  drawText(commands, "@ CARS24", 76, 542, { font: "F4", size: 10, color: colors.blue });

  if (blocks[3]) {
    drawText(commands, blocks[3], 76, 460, { font: "F6", size: 48, color: colors.navy });
  }
  if (blocks[4]) {
    drawText(commands, blocks[4], 76, 420, { font: "F7", size: 18, color: colors.grayBlue });
  }

  drawCoverShape(commands, 85, 250);

  drawText(commands, blocks[0], 68, 48, { font: "F4", size: 9, color: colors.navy });
  drawRightText(commands, "↓ SCROLL TO BEGIN", pageWidth - 68, 48, { font: "F4", size: 9, color: colors.navy });
}

function renderDivider(commands, page, pageNumber) {
  const [line1, line2, line3] = page.blocks;

  drawText(commands, stripEmphasisMarkers(line1 || ""), 76, 610, {
    font: "F4",
    size: 10,
    color: colors.blue
  });
  drawText(commands, stripEmphasisMarkers(line2 || ""), 76, 520, {
    font: "F6",
    size: 42,
    color: colors.navy
  });
  drawWrappedParagraph(commands, stripEmphasisMarkers(line3 || ""), 76, 470, 280, {
    font: "F7",
    size: 18,
    leading: 26,
    color: colors.grayBlue
  });
  drawCoverShape(commands, 86, 240, true);
  drawFooterLeft(commands, pageNumber);
}

function renderBody(commands, page, pageNumber) {
  if (page.title === "Welcome") {
    return renderWelcome(commands, page, pageNumber);
  }

  drawText(commands, page.title.toUpperCase(), marginX, 716, {
    font: "F4",
    size: 9.5,
    color: colors.blue
  });

  let y = 622;

  if (page.pageTitle) {
    y = drawWrappedParagraph(commands, stripEmphasisMarkers(page.pageTitle), marginX, y, contentWidth, {
      font: "F6",
      size: 31,
      leading: 37,
      color: colors.navy
    });
    y -= 16;
  }

  const blocks = [...page.blocks];
  const quoteCandidate = blocks.length > 1 && isPullQuote(blocks[blocks.length - 1]) ? blocks.pop() : "";

  for (const block of blocks) {
    const isEmphasis = /^\*.*\*$/.test(block);
    y = drawWrappedParagraph(commands, stripEmphasisMarkers(block), marginX, y, contentWidth, {
      font: isEmphasis ? "F7" : "F1",
      size: isEmphasis ? 14 : 16,
      leading: isEmphasis ? 20 : 21,
      color: colors.body
    });
    y -= 10;
  }

  if (quoteCandidate) {
    drawVerticalAccent(commands, marginX, y + 4, 14);
    drawWrappedParagraph(commands, stripEmphasisMarkers(quoteCandidate), marginX + 26, y + 2, contentWidth - 24, {
      font: "F7",
      size: 18,
      leading: 22,
      color: colors.navy
    });
  }

  drawIcon(commands, page.pageTitle, 92, 170);
  drawFooterLeft(commands, pageNumber);
  drawFooterRight(commands, pageNumber);
}

function renderWelcome(commands, page, pageNumber) {
  drawText(commands, "WELCOME", marginX, 690, {
    font: "F4",
    size: 10,
    color: colors.blue
  });

  drawText(commands, "Welcome to Flatland.", marginX, 622, {
    font: "F6",
    size: 32,
    color: colors.navy
  });

  const blocks = [...page.blocks];
  const quoteCandidate = blocks.length > 0 ? blocks.pop() : "";
  let y = 576;

  for (const block of blocks) {
    y = drawWrappedParagraph(commands, stripEmphasisMarkers(block), marginX, y, contentWidth, {
      font: "F1",
      size: 16,
      leading: 22,
      color: colors.body
    });
    y -= 10;
  }

  if (quoteCandidate) {
    drawVerticalAccent(commands, marginX, y + 3, 14);
    drawWrappedParagraph(commands, stripEmphasisMarkers(quoteCandidate), marginX + 26, y + 2, contentWidth - 24, {
      font: "F7",
      size: 18,
      leading: 22,
      color: colors.navy
    });
  }

  drawDotLineIcon(commands, 92, 170);
  drawFooterLeft(commands, pageNumber);
  drawFooterRight(commands, pageNumber);
}

function renderClosing(commands, page, pageNumber) {
  drawText(commands, "CLOSING", 76, 690, { font: "F4", size: 10, color: colors.navy });

  const blocks = [...page.blocks];
  let y = 612;
  const opener = blocks.shift() || "";
  drawText(commands, opener, 76, y, { font: "F6", size: 38, color: colors.navy });
  y -= 48;

  const postscript = blocks.pop() || "";
  const signature = blocks.pop() || "";
  const signoff = blocks.pop() || "";

  for (const block of blocks) {
    y = drawWrappedParagraph(commands, stripEmphasisMarkers(block), 76, y, 460, {
      font: "F1",
      size: 16,
      leading: 22,
      color: colors.body
    });
    y -= 10;
  }

  if (signoff) {
    drawVerticalAccent(commands, 76, 401, 14);
    drawWrappedParagraph(commands, stripEmphasisMarkers(signoff), 102, 400, 420, {
      font: "F7",
      size: 18,
      leading: 22,
      color: colors.navy
    });
  }

  if (signature) {
    drawWrappedParagraph(commands, stripEmphasisMarkers(signature), 76, 246, 220, {
      font: "F7",
      size: 17,
      leading: 20,
      color: colors.navy
    });
  }
  if (postscript) {
    drawWrappedParagraph(commands, stripEmphasisMarkers(postscript), 76, 208, 420, {
      font: "F7",
      size: 12.5,
      leading: 16,
      color: colors.navy
    });
  }

  drawClosingShape(commands, 112, 135);
  drawFooterLeft(commands, pageNumber);
  drawRightText(commands, "CLOSING", pageWidth - 76, 48, { font: "F4", size: 9, color: colors.navy });
}

function drawWrappedParagraph(commands, text, x, y, width, options) {
  const lines = wrapText(text, width, options.size);
  let cursorY = y;

  for (const line of lines) {
    drawText(commands, line, x, cursorY, options);
    cursorY -= options.leading;
  }

  return cursorY;
}

function drawCenteredWrapped(commands, text, centerX, y, width, options) {
  const lines = wrapText(text, width, options.size);
  let cursorY = y;

  for (const line of lines) {
    drawCenteredText(commands, line, centerX, cursorY, options);
    cursorY -= options.leading;
  }

  return cursorY;
}

function drawText(commands, text, x, y, options) {
  const [r, g, b] = options.color || [0, 0, 0];
  commands.push(
    "BT",
    `/${options.font} ${options.size} Tf`,
    `${r} ${g} ${b} rg`,
    `1 0 0 1 ${format(x)} ${format(y)} Tm`,
    `(${escapePdfText(text)}) Tj`,
    "ET"
  );
}

function drawRightText(commands, text, rightX, y, options) {
  const width = measureText(text, options.size);
  drawText(commands, text, rightX - width, y, options);
}

function drawCenteredText(commands, text, centerX, y, options) {
  const width = measureText(text, options.size);
  drawText(commands, text, centerX - width / 2, y, options);
}

function paintBackground(commands, color) {
  commands.push(
    `${color[0]} ${color[1]} ${color[2]} rg`,
    `0 0 ${pageWidth} ${pageHeight} re`,
    "f"
  );
}

function drawFooterLeft(commands, pageNumber) {
  drawText(commands, "CARS24 · 2026 · FLATLAND", 68, 42, { font: "F4", size: 8.5, color: colors.navy });
}

function drawFooterRight(commands, pageNumber) {
  drawRightText(commands, `PAGE ${pageNumber}`, pageWidth - 68, 42, {
    font: "F4",
    size: 8.5,
    color: colors.navy
  });
}

function drawVerticalAccent(commands, x, y, h) {
  commands.push(
    `${colors.blue[0]} ${colors.blue[1]} ${colors.blue[2]} RG`,
    "2 w",
    `${format(x)} ${format(y)} m`,
    `${format(x)} ${format(y + h)} l`,
    "S"
  );
}

function drawCoverShape(commands, x, y, yellowTip = false) {
  commands.push(
    `${colors.lightBlue[0]} ${colors.lightBlue[1]} ${colors.lightBlue[2]} rg`,
    `${format(x + 25)} ${format(y)} 60 40 re`,
    "f",
    `${colors.navy[0]} ${colors.navy[1]} ${colors.navy[2]} RG`,
    "1.3 w",
    `${format(x)} ${format(y + 40)} m`,
    `${format(x + 140)} ${format(y + 40)} l`,
    "S"
  );
  if (yellowTip) {
    commands.push(
      `${colors.softYellow[0]} ${colors.softYellow[1]} ${colors.softYellow[2]} rg`,
      `${format(x + 70)} ${format(y + 90)} m`,
      `${format(x + 50)} ${format(y + 40)} l`,
      `${format(x + 90)} ${format(y + 40)} l`,
      "f"
    );
  }
  commands.push(
    `${colors.navy[0]} ${colors.navy[1]} ${colors.navy[2]} RG`,
    "1.7 w",
    `${format(x + 70)} ${format(y + 90)} m`,
    `${format(x + 40)} ${format(y + 5)} l`,
    `${format(x + 100)} ${format(y + 5)} l`,
    "h",
    "S"
  );
}

function drawClosingShape(commands, x, y) {
  commands.push(
    `${colors.navy[0]} ${colors.navy[1]} ${colors.navy[2]} RG`,
    `${colors.blue[0]} ${colors.blue[1]} ${colors.blue[2]} rg`,
    "1.7 w",
    `${format(x)} ${format(y)} m`,
    `${format(x + 20)} ${format(y + 40)} ${format(x + 54)} ${format(y + 40)} ${format(x + 84)} ${format(y)} c`,
    "S"
  );
  drawFilledCircle(commands, x, y, 2.5, colors.navy);
  drawFilledCircle(commands, x + 94, y, 4, colors.blue);
}

function drawIcon(commands, title, x, y) {
  const lower = title.toLowerCase();

  if (lower.includes("builder")) return drawBuilderIcon(commands, x, y);
  if (lower.includes("information")) return drawNetworkIcon(commands, x, y);
  if (lower.includes("spend")) return drawBarsIcon(commands, x, y);
  if (lower.includes("bureaucracy")) return drawSpiralIcon(commands, x, y);
  if (lower.includes("living system")) return drawWaveIcon(commands, x, y);
  if (lower.includes("agency")) return drawArrowCircleIcon(commands, x, y);
  if (lower.includes("trust")) return drawGateIcon(commands, x, y);
  if (lower.includes("fast")) return drawLoopIcon(commands, x, y);
  if (lower.includes("context")) return drawFrameIcon(commands, x, y);
  if (lower.includes("documentation")) return drawPageIcon(commands, x, y);
  if (lower.includes("prefixes")) return drawLabelsIcon(commands, x, y);
  if (lower.includes("weight")) return drawBalanceIcon(commands, x, y);
  if (lower.includes("not flat")) return drawCoverShape(commands, x - 5, y - 10, true);
  return drawDotLineIcon(commands, x, y);
}

function strokeSetup(commands) {
  commands.push(`${colors.navy[0]} ${colors.navy[1]} ${colors.navy[2]} RG`, "1.4 w");
}

function drawBuilderIcon(commands, x, y) {
  strokeSetup(commands);
  drawCircle(commands, x + 38, y + 56, 8);
  commands.push(
    `${format(x + 38)} ${format(y + 48)} m ${format(x + 38)} ${format(y + 18)} l S`,
    `${format(x + 38)} ${format(y + 35)} m ${format(x + 18)} ${format(y + 20)} l S`,
    `${format(x + 38)} ${format(y + 35)} m ${format(x + 62)} ${format(y + 35)} l S`,
    `${format(x + 38)} ${format(y + 18)} m ${format(x + 24)} ${format(y)} l S`,
    `${format(x + 38)} ${format(y + 18)} m ${format(x + 52)} ${format(y)} l S`,
    `${colors.softYellow[0]} ${colors.softYellow[1]} ${colors.softYellow[2]} rg`,
    `${format(x + 62)} ${format(y + 18)} 30 30 re f`,
    `${colors.navy[0]} ${colors.navy[1]} ${colors.navy[2]} RG`,
    `${format(x + 62)} ${format(y + 18)} 30 30 re S`,
    `${format(x - 2)} ${format(y)} m ${format(x + 86)} ${format(y)} l S`
  );
}

function drawNetworkIcon(commands, x, y) {
  strokeSetup(commands);
  const pts = [[x + 28, y + 40], [x + 68, y + 40], [x + 48, y]];
  commands.push(
    `${format(pts[0][0])} ${format(pts[0][1])} m ${format(pts[1][0])} ${format(pts[1][1])} l S`,
    `${format(pts[1][0])} ${format(pts[1][1])} m ${format(pts[2][0])} ${format(pts[2][1])} l S`,
    `${format(pts[2][0])} ${format(pts[2][1])} m ${format(pts[0][0])} ${format(pts[0][1])} l S`
  );
  for (const [cx, cy] of pts) {
    drawFilledCircle(commands, cx, cy, 12, colors.lightBlue);
    strokeSetup(commands);
    drawCircle(commands, cx, cy, 12);
  }
}

function drawBarsIcon(commands, x, y) {
  commands.push(
    `${colors.lightBlue[0]} ${colors.lightBlue[1]} ${colors.lightBlue[2]} rg`,
    `${format(x + 8)} ${format(y)} 36 70 re f`,
    `${colors.softYellow[0]} ${colors.softYellow[1]} ${colors.softYellow[2]} rg`,
    `${format(x + 56)} ${format(y)} 36 70 re f`
  );
  strokeSetup(commands);
  commands.push(
    `${format(x + 8)} ${format(y)} 36 70 re S`,
    `${format(x + 56)} ${format(y)} 36 70 re S`
  );
  drawCenteredText(commands, "50%", x + 26, y + 30, { font: "F4", size: 9, color: colors.navy });
  drawCenteredText(commands, "50%", x + 74, y + 30, { font: "F4", size: 9, color: colors.navy });
}

function drawSpiralIcon(commands, x, y) {
  strokeSetup(commands);
  let radius = 8;
  let cx = x + 56;
  let cy = y + 26;
  let lastX = cx;
  let lastY = cy;
  for (let angle = 0; angle <= Math.PI * 6; angle += 0.2) {
    radius += 0.7;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    commands.push(`${format(lastX)} ${format(lastY)} m ${format(px)} ${format(py)} l S`);
    lastX = px;
    lastY = py;
  }
  drawFilledCircle(commands, cx, cy, 4, colors.softYellow);
  drawFilledCircle(commands, lastX, lastY, 3, colors.navy);
}

function drawWaveIcon(commands, x, y) {
  strokeSetup(commands);
  commands.push(
    `${format(x)} ${format(y)} m`,
    `${format(x + 18)} ${format(y + 34)} ${format(x + 48)} ${format(y + 34)} ${format(x + 78)} ${format(y)} c`,
    "S"
  );
  drawFilledCircle(commands, x, y, 2.5, colors.navy);
  drawFilledCircle(commands, x + 84, y, 4, colors.blue);
}

function drawArrowCircleIcon(commands, x, y) {
  strokeSetup(commands);
  drawCircle(commands, x + 40, y + 24, 20);
  commands.push(
    `${format(x + 12)} ${format(y + 24)} m ${format(x + 68)} ${format(y + 24)} l S`,
    `${format(x + 58)} ${format(y + 34)} m ${format(x + 68)} ${format(y + 24)} l ${format(x + 58)} ${format(y + 14)} l S`
  );
}

function drawGateIcon(commands, x, y) {
  strokeSetup(commands);
  commands.push(
    `${format(x)} ${format(y)} m ${format(x)} ${format(y + 52)} l ${format(x + 62)} ${format(y + 52)} l S`,
    `${format(x + 12)} ${format(y)} m ${format(x + 12)} ${format(y + 40)} l S`,
    `${format(x + 28)} ${format(y)} m ${format(x + 28)} ${format(y + 40)} l S`,
    `${format(x + 44)} ${format(y)} m ${format(x + 44)} ${format(y + 40)} l S`,
    `${format(x + 62)} ${format(y + 52)} m ${format(x + 78)} ${format(y + 42)} l ${format(x + 78)} ${format(y + 10)} l S`
  );
}

function drawLoopIcon(commands, x, y) {
  strokeSetup(commands);
  drawCircle(commands, x + 18, y + 18, 18);
  drawCircle(commands, x + 54, y + 18, 18);
  commands.push(
    `${format(x + 36)} ${format(y + 18)} m ${format(x + 36)} ${format(y + 18)} l`,
    `${format(x + 60)} ${format(y + 18)} m ${format(x + 74)} ${format(y + 18)} l S`,
    `${format(x + 66)} ${format(y + 26)} m ${format(x + 74)} ${format(y + 18)} l ${format(x + 66)} ${format(y + 10)} l S`
  );
}

function drawFrameIcon(commands, x, y) {
  commands.push(
    `${colors.lightBlue[0]} ${colors.lightBlue[1]} ${colors.lightBlue[2]} rg`,
    `${format(x + 10)} ${format(y + 10)} 56 42 re f`
  );
  strokeSetup(commands);
  commands.push(`${format(x)} ${format(y)} 56 42 re S`);
}

function drawPageIcon(commands, x, y) {
  commands.push(
    `${colors.softYellow[0]} ${colors.softYellow[1]} ${colors.softYellow[2]} rg`,
    `${format(x + 8)} ${format(y)} 44 56 re f`
  );
  strokeSetup(commands);
  commands.push(
    `${format(x + 8)} ${format(y)} 44 56 re S`,
    `${format(x + 16)} ${format(y + 40)} m ${format(x + 44)} ${format(y + 40)} l S`,
    `${format(x + 16)} ${format(y + 28)} m ${format(x + 44)} ${format(y + 28)} l S`,
    `${format(x + 16)} ${format(y + 16)} m ${format(x + 38)} ${format(y + 16)} l S`
  );
}

function drawLabelsIcon(commands, x, y) {
  strokeSetup(commands);
  commands.push(
    `${format(x)} ${format(y + 40)} 60 18 re S`,
    `${format(x + 10)} ${format(y + 12)} 72 18 re S`,
    `${format(x + 20)} ${format(y - 16)} 54 18 re S`
  );
}

function drawBalanceIcon(commands, x, y) {
  strokeSetup(commands);
  commands.push(
    `${format(x + 40)} ${format(y)} m ${format(x + 40)} ${format(y + 60)} l S`,
    `${format(x + 18)} ${format(y + 48)} m ${format(x + 62)} ${format(y + 48)} l S`,
    `${format(x + 18)} ${format(y + 48)} m ${format(x + 8)} ${format(y + 28)} l ${format(x + 28)} ${format(y + 28)} l h S`,
    `${format(x + 62)} ${format(y + 48)} m ${format(x + 52)} ${format(y + 28)} l ${format(x + 72)} ${format(y + 28)} l h S`
  );
}

function drawDotLineIcon(commands, x, y) {
  strokeSetup(commands);
  drawFilledCircle(commands, x, y, 3, colors.navy);
  commands.push(`${format(x)} ${format(y)} m ${format(x + 72)} ${format(y + 36)} l S`);
  drawFilledCircle(commands, x + 82, y + 36, 3, colors.navy);
}

function isPullQuote(text) {
  const plain = stripEmphasisMarkers(text);
  return plain.length <= 90;
}

function stripEmphasisMarkers(text) {
  if (/^\*.*\*$/.test(text)) {
    return text.slice(1, -1).trim();
  }

  return text;
}

function wrapText(text, width, fontSize) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (!current || measureText(candidate, fontSize) <= width) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function measureText(text, fontSize) {
  let units = 0;

  for (const char of text) {
    if (char === " ") {
      units += 0.28;
    } else if (/[A-Z]/.test(char)) {
      units += 0.64;
    } else if (/[a-z]/.test(char)) {
      units += 0.5;
    } else if (/[0-9]/.test(char)) {
      units += 0.54;
    } else if (".,;:!|'".includes(char)) {
      units += 0.24;
    } else if ("()-".includes(char)) {
      units += 0.32;
    } else if ("/".includes(char)) {
      units += 0.35;
    } else {
      units += 0.58;
    }
  }

  return units * fontSize;
}

function drawCircle(commands, cx, cy, r) {
  const k = 0.552284749831;
  const c = r * k;
  commands.push(
    `${format(cx + r)} ${format(cy)} m`,
    `${format(cx + r)} ${format(cy + c)} ${format(cx + c)} ${format(cy + r)} ${format(cx)} ${format(cy + r)} c`,
    `${format(cx - c)} ${format(cy + r)} ${format(cx - r)} ${format(cy + c)} ${format(cx - r)} ${format(cy)} c`,
    `${format(cx - r)} ${format(cy - c)} ${format(cx - c)} ${format(cy - r)} ${format(cx)} ${format(cy - r)} c`,
    `${format(cx + c)} ${format(cy - r)} ${format(cx + r)} ${format(cy - c)} ${format(cx + r)} ${format(cy)} c`,
    "S"
  );
}

function drawFilledCircle(commands, cx, cy, r, color) {
  const k = 0.552284749831;
  const c = r * k;
  commands.push(
    `${color[0]} ${color[1]} ${color[2]} rg`,
    `${format(cx + r)} ${format(cy)} m`,
    `${format(cx + r)} ${format(cy + c)} ${format(cx + c)} ${format(cy + r)} ${format(cx)} ${format(cy + r)} c`,
    `${format(cx - c)} ${format(cy + r)} ${format(cx - r)} ${format(cy + c)} ${format(cx - r)} ${format(cy)} c`,
    `${format(cx - r)} ${format(cy - c)} ${format(cx - c)} ${format(cy - r)} ${format(cx)} ${format(cy - r)} c`,
    `${format(cx + c)} ${format(cy - r)} ${format(cx + r)} ${format(cy - c)} ${format(cx + r)} ${format(cy)} c`,
    "f"
  );
}

function escapePdfText(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function format(value) {
  return Number.parseFloat(value.toFixed(2)).toString();
}

function serializePdf(objects) {
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.byteLength(pdf, "utf8");
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
