#!/usr/bin/env node
// Static constraint checker for social-post-card decks.
// Usage: node scripts/check-cards.mjs <path/to/index.html>
// Exit 1 on any FAIL. Run this BEFORE rendering.

import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node check-cards.mjs <index.html>');
  process.exit(2);
}
const html = readFileSync(file, 'utf8');

const fails = [];
const warns = [];
const fail = (where, msg) => fails.push(`${where}: ${msg}`);
const warn = (where, msg) => warns.push(`${where}: ${msg}`);

// ---------- helpers ----------

// Visual width in CJK units: fullwidth char = 1, ASCII = 0.5.
const width = (s) => {
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    w += (c >= 0x1100 && c <= 0x9fff) || (c >= 0xf900 && c <= 0xffef) ? 1 : 0.5;
  }
  return Math.round(w * 10) / 10;
};

const stripTags = (s) => s.replace(/<[^>]+>/g, '');
const decode = (s) =>
  s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const text = (s) => decode(stripTags(s)).replace(/\s+/g, ' ').trim();

const pick = (scope, cls) => {
  const re = new RegExp(`<([a-z0-9]+)[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)</\\1>`, 'i');
  const m = scope.match(re);
  return m ? m[2] : null;
};

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

// ---------- deck-level ----------

const sections = [...html.matchAll(/<section[^>]*class="[^"]*\bposter\b[^"]*"[^>]*>([\s\S]*?)<\/section>/gi)]
  .map((m) => m[0]);

if (!sections.length) fail('deck', '没有 .poster');
const N = sections.length;

// ---------- account config（整批只配置一次，在 :root 里）----------
const rootBlock = (html.match(/:root\s*\{([\s\S]*?)\}/) || [, ''])[1];
const avatarVar = /--account-avatar:\s*url\("([^"]*)"\)/.exec(rootBlock);
const nameVar = /--account-name:\s*"([^"]*)"/.exec(rootBlock);
const bioVar = /--account-bio:\s*"([^"]*)"/.exec(rootBlock);

if (!avatarVar || !avatarVar[1] || avatarVar[1].includes('{{'))
  fail('account', '--account-avatar 缺少真实路径（还是占位符 {{头像路径}}）');
if (!nameVar || !nameVar[1] || nameVar[1].includes('{{')) fail('account', '--account-name 缺少真实昵称（还是占位符）');
else if (width(nameVar[1]) > 10) fail('account', `--account-name ${width(nameVar[1])} 字宽，上限 10`);
if (!bioVar || !bioVar[1] || bioVar[1].includes('{{')) fail('account', '--account-bio 缺少真实 bio（还是占位符）');
else if (width(bioVar[1]) > 22) fail('account', `--account-bio ${width(bioVar[1])} 字宽，上限 22`);

for (const [i, s] of sections.entries()) {
  const tag = `page${String(i + 1).padStart(2, '0')}`;
  if (/style="[^"]*font-(size|weight)/i.test(s)) fail(tag, 'inline font-size / font-weight 是禁止的');
  if (/style="[^"]*(border-radius|box-shadow)/i.test(s))
    fail(tag, 'inline border-radius / box-shadow 是禁止的');
  if (EMOJI.test(s)) fail(tag, '出现 emoji');

  // ---------- profile-head ----------
  // 头像/昵称/bio 现在是 :root 里的整批配置（上面已校验一次），这里只查每张卡
  // 自己的部分：认证图标和页码。
  if (!/\bprofile-head\b/.test(s)) fail(tag, '缺少 .profile-head');
  else {
    if (!/<svg[^>]*class="[^"]*\bverified\b/i.test(s)) fail(tag, '缺少认证图标 .verified，固定必须有');

    const pageInner = pick(s, 'page-index');
    if (pageInner === null) fail(tag, '缺少 .page-index');
    else {
      const m = text(pageInner).match(/^(\d{2})\s*\/\s*(\d{2})$/);
      if (!m) fail(tag, `.page-index 格式应为 “NN / MM”，实际 “${text(pageInner)}”`);
      else {
        const cur = Number(m[1]);
        const total = Number(m[2]);
        if (total !== N) fail(tag, `.page-index 总数 ${total}，实际张数 ${N}，必须相等`);
        if (cur !== i + 1) fail(tag, `.page-index 当前页 ${m[1]}，应为 ${String(i + 1).padStart(2, '0')}`);
      }
    }
  }

  // ---------- intro ----------
  const introInner = pick(s, 'intro');
  if (introInner === null) fail(tag, '缺少 .intro');
  else {
    if (/<(ul|ol|table|pre|code|img)\b/i.test(introInner)) fail(tag, '.intro 只允许 <p>，不许列表/表格/代码块/图片');
    if (/<br\s*\/?>/i.test(introInner)) fail(tag, '.intro 不允许手动 <br>');
    if (EMOJI.test(introInner)) fail(tag, '.intro 出现 emoji');
    const ps = [...introInner.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
    if (ps.length < 1 || ps.length > 2) fail(tag, `.intro ${ps.length} 段，应为 1–2 段`);
    let lines = 0;
    ps.forEach((p, i2) => {
      const l = Math.ceil(width(text(p)) / 24);
      if (l > 10) fail(tag, `.intro 第 ${i2 + 1} 段 ${l} 行，单段上限 10 行（等于总行数上限——一段占满整个预算也可以）`);
      lines += l;
      if (!/^\s*<strong>[^<]+<\/strong>/i.test(p))
        fail(tag, `.intro 第 ${i2 + 1} 段没有以 <strong>总结句</strong> 开头`);
      if ((p.match(/<strong>/gi) || []).length > 1)
        fail(tag, `.intro 第 ${i2 + 1} 段 <strong> 出现多次，一段只加粗开头的总结句`);
    });
    if (lines < 7) fail(tag, `.intro 共 ${lines} 行，下限 7 行（少于此 .grow 会留出明显空白）`);
    else if (lines > 10) fail(tag, `.intro 共 ${lines} 行，上限 10 行（多于此图片会被顶出内容框）`);
  }

  // ---------- photo ----------
  const photoInner = pick(s, 'photo-frame');
  if (photoInner === null) fail(tag, '缺少 .photo-frame');
  else {
    const imgs = [...photoInner.matchAll(/<img\b[^>]*src="([^"]*)"/gi)];
    if (imgs.length !== 1) fail(tag, `.photo-frame 应有且只有 1 张 <img>，实际 ${imgs.length} 张`);
    else if (!imgs[0][1] || imgs[0][1].includes('{{')) fail(tag, '.photo-frame 的 <img> 缺少真实 src（还是占位符 {{图片路径}}）');
  }
  if ((s.match(/class="[^"]*\bphoto-frame\b/gi) || []).length > 1)
    fail(tag, '一张卡只能有 1 个 .photo-frame');
}

// ---------- report ----------

for (const w of warns) console.log(`WARN  ${w}`);
for (const f of fails) console.log(`FAIL  ${f}`);
console.log(`\n${fails.length ? '✗' : '✓'} ${file} — 共 ${N} 张 · FAIL ${fails.length} · WARN ${warns.length}`);
process.exit(fails.length ? 1 : 0);
