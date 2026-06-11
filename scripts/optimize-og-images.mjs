import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const mediaDir = path.join(rootDir, "src", "media");
const maxKb = Number.parseFloat(process.env.OG_IMAGE_MAX_KB || "300");
const targetPatterns = [
  /-preview\.png$/i,
  /-social\.png$/i
];

async function main() {
  const entries = await fs.readdir(mediaDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && targetPatterns.some((pattern) => pattern.test(entry.name)))
    .map((entry) => path.join(mediaDir, entry.name));

  let optimizedCount = 0;

  for (const file of files) {
    const before = await fs.stat(file);
    const beforeKb = before.size / 1024;

    if (beforeKb <= maxKb) {
      continue;
    }

    const extension = path.extname(file);
    const basename = path.basename(file, extension);
    const tempFile = path.join(path.dirname(file), `.${basename}.optimized${extension}`);
    await runFfmpeg(file, tempFile);

    const after = await fs.stat(tempFile);
    const afterKb = after.size / 1024;

    if (after.size < before.size) {
      await fs.rename(tempFile, file);
      optimizedCount += 1;
      console.log(`optimized ${path.basename(file)}: ${beforeKb.toFixed(1)} KB -> ${afterKb.toFixed(1)} KB`);
      continue;
    }

    await fs.rm(tempFile, { force: true });
    console.log(`kept ${path.basename(file)}: ${beforeKb.toFixed(1)} KB`);
  }

  if (optimizedCount === 0) {
    console.log("No oversized OG PNGs needed optimization.");
  }
}

function runFfmpeg(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    const child = spawn("/opt/homebrew/bin/ffmpeg", [
      "-y",
      "-i",
      inputFile,
      "-pred",
      "mixed",
      "-compression_level",
      "9",
      outputFile
    ], {
      stdio: "ignore"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
