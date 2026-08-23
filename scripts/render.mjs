#!/usr/bin/env node
// Render each .poster in a deck to a 1080×1440 PNG using headless Chrome.
// Usage: node scripts/render.mjs <task-dir>              (reads <task-dir>/index.html)
//        node scripts/render.mjs <task-dir> --out <dir>  (override the output folder)
//        node scripts/render.mjs <task-dir> --keep       (keep the per-page temp HTML)
// Output: ~/Desktop/<task-dir 名>/NN-<id>.png（无桌面环境则落在 <task-dir>/out/）
//
// No npm deps. Falls back through the usual Chrome/Chromium locations.
// 头像与图片用相对路径引用时，相对的是 <task-dir>（index.html 所在目录）。

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
if (!dir) {
  console.error('usage: node render.mjs <task-dir> [--out <dir>] [--keep]');
  process.exit(2);
}
const keep = args.includes('--keep');
const outFlag = args.indexOf('--out') >= 0 ? args[args.indexOf('--out') + 1] : null;
const root = resolve(dir);
const src = join(root, 'index.html');
if (!existsSync(src)) {
  console.error(`找不到 ${src}`);
  process.exit(2);
}

const CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const chrome = process.env.CHROME_PATH || CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('找不到 Chrome。设置 CHROME_PATH=<可执行文件路径> 后重试。');
  process.exit(2);
}

const html = readFileSync(src, 'utf8');
const sections = [...html.matchAll(/<section[^>]*class="[^"]*\bposter\b[^"]*"[^>]*>[\s\S]*?<\/section>/gi)]
  .map((m) => m[0]);
if (!sections.length) {
  console.error('index.html 里没有 .poster');
  process.exit(2);
}

// 默认导出到桌面上以任务目录命名的文件夹；没有桌面（无桌面环境的 Linux、
// CI）就退回任务目录，不要凭空在 home 下建一个 Desktop。
const desktop = join(homedir(), 'Desktop');
const out = outFlag
  ? resolve(outFlag)
  : existsSync(desktop)
    ? join(desktop, basename(root))
    : join(root, 'out');
mkdirSync(out, { recursive: true });

const tmps = [];
sections.forEach((sec, i) => {
  const id = (sec.match(/id="([^"]+)"/) || [, `page${i + 1}`])[1];
  const name = `${String(i + 1).padStart(2, '0')}-${id}`;
  // Isolate one poster and strip the sheet's screen-only padding/gap so the
  // 1080×1440 viewport lands exactly on the board. Rendered from a temp file
  // IN <task-dir> so relative <img src> (avatar / photo) still resolve.
  const page = html
    .replace(/<main class="sheet">[\s\S]*<\/main>/, `<main class="sheet">${sec}</main>`)
    .replace(/padding:\s*64px 32px;/, 'padding: 0;')
    .replace(/gap:\s*48px;/, 'gap: 0;');
  const tmp = join(root, `.render-${name}.html`);
  writeFileSync(tmp, page);
  tmps.push(tmp);

  execFileSync(chrome, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1080,1440',
    '--virtual-time-budget=10000',
    `--screenshot=${join(out, `${name}.png`)}`,
    `file://${tmp}`,
  ], { stdio: 'ignore' });

  console.log(`✓ ${join(out, `${name}.png`)}`);
});

if (!keep) for (const t of tmps) rmSync(t, { force: true });
console.log(`\n${sections.length} 张已导出到 ${out}`);
