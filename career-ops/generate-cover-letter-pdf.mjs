#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));

const input = process.argv[2] ?? "cover-letter-amex-apprentice.md";
const output = process.argv[3] ?? "output/cover-letter-amex-apprentice.pdf";

const inputPath = resolve(__dirname, input);
const outputPath = resolve(__dirname, output);

function buildHtml(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Cover Letter</title>
  <style>
    @page { size: letter; margin: 1in; }
    * { box-sizing: border-box; }
    body {
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #111;
      margin: 0;
      padding: 0;
    }
    p { margin: 0 0 12px; text-align: justify; }
    p:first-child { text-align: left; margin-bottom: 4px; }
    p:nth-child(2) { margin-bottom: 18px; }
    strong { font-weight: 700; }
    a { color: #111; text-decoration: none; }
    hr { display: none; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

async function main() {
  const markdown = readFileSync(inputPath, "utf8").trim();
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
    margin: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
    preferCSSPageSize: true,
  });
  await browser.close();

  console.log(`Wrote ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
