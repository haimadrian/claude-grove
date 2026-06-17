#!/usr/bin/env node
// Builds a GitHub Pages site for claude-grove:
//   _pages/index.html            - project home with links to reports
//   _pages/reports/unit/         - Vitest HTML report
//   _pages/reports/coverage/     - v8 coverage HTML

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "_pages");

function rimraf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
  return true;
}

rimraf(out);
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(path.join(out, "reports"), { recursive: true });
fs.mkdirSync(path.join(out, "assets"), { recursive: true });

const css = `
:root {
  --bg: #0d1117; --bg-elev: #161b22; --panel: #161b22;
  --border: #30363d; --text: #e6edf3; --text-mute: #848d97;
  --accent: #388bfd; --shadow: 0 8px 32px rgba(0,0,0,0.5);
}
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; -webkit-font-smoothing: antialiased; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
code { background: rgba(56,139,253,0.1); color: #cae0ff; padding: 1px 5px; border-radius: 3px; font-size: 0.92em; }
h1 { font-size: 28px; margin: 0 0 8px; }
h2 { font-size: 18px; margin-top: 32px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
.container { max-width: 860px; margin: 0 auto; padding: 48px 32px; }
.hero { background: linear-gradient(135deg, #1a3a78 0%, #0d1117 100%); padding: 36px 40px; border-radius: 12px; border: 1px solid #2a3f66; margin-bottom: 32px; box-shadow: var(--shadow); }
.hero .sub { color: #cfdcf0; font-size: 15px; max-width: 640px; line-height: 1.6; margin-top: 8px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-top: 16px; }
.card { display: block; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 18px 20px; color: inherit; transition: border-color 120ms; }
.card:hover { border-color: var(--accent); text-decoration: none; }
.card .title { font-weight: 600; color: #f0f6ff; margin-bottom: 6px; font-size: 15px; }
.card .desc { font-size: 13px; color: var(--text-mute); line-height: 1.5; }
.badge { display: inline-block; background: rgba(56,139,253,0.15); color: var(--accent); border: 1px solid rgba(56,139,253,0.3); border-radius: 20px; font-size: 12px; padding: 2px 10px; margin-right: 6px; }
footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid var(--border); color: var(--text-mute); font-size: 13px; }
`;
fs.writeFileSync(path.join(out, "assets", "style.css"), css.trim() + "\n");

const placeholder = (title, backSteps = 2) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>` +
  `<link rel="stylesheet" href="${"../".repeat(backSteps)}assets/style.css"></head>` +
  `<body><div class="container"><h1>${title}</h1><p>Not available for this run.</p>` +
  `<p><a href="${"../".repeat(backSteps)}index.html">← Back</a></p></div></body></html>\n`;

const unit = copyDir(path.join(root, "reports/unit-html"), path.join(out, "reports/unit"));
const coverage = copyDir(path.join(root, "reports/coverage"), path.join(out, "reports/coverage"));

if (!unit) {
  fs.mkdirSync(path.join(out, "reports/unit"), { recursive: true });
  fs.writeFileSync(path.join(out, "reports/unit/index.html"), placeholder("Unit tests report"));
}
if (!coverage) {
  fs.mkdirSync(path.join(out, "reports/coverage"), { recursive: true });
  fs.writeFileSync(path.join(out, "reports/coverage/index.html"), placeholder("Coverage report"));
}

const indexHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Claude Grove</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<link rel="stylesheet" href="assets/style.css" />
</head>
<body>
<div class="container">
  <section class="hero">
    <h1>🌳 Claude Grove</h1>
    <p class="sub">A macOS desktop app to view and manage local git worktrees across multiple repos — with PR status, Claude Code session linkage, and an in-app GitHub-style diff viewer.</p>
  </section>

  <h2>Reports</h2>
  <div class="cards">
    <a class="card" href="reports/unit/index.html">
      <div class="title">🧪 Unit tests</div>
      <div class="desc">Vitest HTML report from the latest main build.</div>
    </a>
    <a class="card" href="reports/coverage/index.html">
      <div class="title">📊 Coverage</div>
      <div class="desc">V8 coverage — line, statement, branch, function.</div>
    </a>
  </div>

  <h2>Links</h2>
  <div class="cards">
    <a class="card" href="https://github.com/haimadrian/claude-grove" target="_blank" rel="noopener">
      <div class="title">📦 GitHub</div>
      <div class="desc">Source code, issues, pull requests.</div>
    </a>
    <a class="card" href="https://github.com/haimadrian/claude-grove/releases" target="_blank" rel="noopener">
      <div class="title">🚀 Releases</div>
      <div class="desc">Download the latest .dmg for Apple Silicon.</div>
    </a>
  </div>

  <footer>Created by Haim Adrian &nbsp;·&nbsp; <a href="https://github.com/haimadrian/claude-grove">haimadrian/claude-grove</a></footer>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(out, "index.html"), indexHtml);

console.log(`[build-pages] wrote site to ${out}`);
console.log(`  unit report: ${unit ? "copied" : "placeholder"}`);
console.log(`  coverage:    ${coverage ? "copied" : "placeholder"}`);
