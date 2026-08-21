#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));

const input = process.argv[2] ?? "cv-amex-apprentice.md";
const output = process.argv[3] ?? "output/cv-amex-apprentice.pdf";

const inputPath = resolve(__dirname, input);
const outputPath = resolve(__dirname, output);

function extractResumeMarkdown(raw) {
  const stopMarkers = [
    "\n<!-- Resume notes",
    "\n# Changes Made",
    "\n## Changes Made",
  ];
  let text = raw;
  for (const marker of stopMarkers) {
    const idx = text.indexOf(marker);
    if (idx !== -1) text = text.slice(0, idx);
  }
  return text.trim();
}

function buildHtml(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Resume</title>
  <style>
    @page { size: letter; margin: 0.42in 0.5in; }
    * { box-sizing: border-box; }
    body {
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 9.25pt;
      line-height: 1.28;
      color: #111;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 17pt;
      margin: 0 0 2px;
      letter-spacing: 0.2px;
    }
    h2 {
      font-size: 10pt;
      margin: 9px 0 4px;
      padding-bottom: 1px;
      border-bottom: 1px solid #222;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    h3, p.contact { margin: 0; }
    p { margin: 0 0 4px; }
    strong { font-weight: 700; }
    ul { margin: 2px 0 4px 0; padding-left: 15px; }
    li { margin: 0 0 1.5px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 2px 0 4px;
      font-size: 8.75pt;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 2px 4px;
      text-align: left;
      vertical-align: top;
    }
    th { background: #f4f4f4; font-weight: 600; }
    hr { display: none; }
    a { color: #111; text-decoration: none; }
    em { font-style: italic; }
    .role { margin: 4px 0 1px; }
    .role strong { font-size: 9.5pt; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

async function main() {
  const raw = readFileSync(inputPath, "utf8");
  const markdown = extractResumeMarkdown(raw);
  const bodyHtml = await marked.parse(markdown);
  const html = buildHtml(bodyHtml);

  mkdirSync(dirname(outputPath), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.pdf({
    path: outputPath,
    format: "Letter",
    printBackground: true,
    margin: { top: "0.42in", right: "0.5in", bottom: "0.42in", left: "0.5in" },
    preferCSSPageSize: true,
  });
  await browser.close();

  console.log(`Wrote ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
