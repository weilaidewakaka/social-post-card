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

// ---------- 出图模式：单页 = 1 张内容卡；长文 = 1 张封面卡（.cover）+ ≥1 张内容卡 ----------
const isCoverSec = (s) => /<section[^>]*class="[^"]*\bcover\b/i.test(s);
const coverIdx = sections.map((s, i) => (isCoverSec(s) ? i : -1)).filter((i) => i >= 0);
if (coverIdx.length > 1) fail('deck', `出现 ${coverIdx.length} 张封面卡（.cover），整批最多 1 张`);
else if (coverIdx.length === 1) {
  if (coverIdx[0] !== 0) fail('deck', '封面卡（.cover）必须是第 1 张');
  if (N < 2) fail('deck', '长文模式至少要 1 张章节卡，只有封面不成立');
} else if (N > 1) fail('deck', `${N} 张卡但没有封面卡：单页模式只能 1 张，多张必须是长文模式（第 1 张带 .cover）`);

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

// ---------- accent 颜色（body class，整批只配置一次，固定二选一）----------
const bodyClassMatch = html.match(/<body[^>]*class="([^"]*)"/i);
const ACCENT_CLASSES = ['accent-orange', 'accent-blue'];
if (!bodyClassMatch) fail('accent', '<body> 缺少 class，应为 accent-orange 或 accent-blue 之一');
else {
  const bodyClasses = bodyClassMatch[1].trim().split(/\s+/);
  const accentClasses = bodyClasses.filter((c) => c.startsWith('accent-'));
  if (accentClasses.length !== 1 || !ACCENT_CLASSES.includes(accentClasses[0]))
    fail('accent', `<body> 的 accent class 应恰好是 accent-orange 或 accent-blue 之一，实际 “${bodyClasses.join(' ') || '(空)'}”`);
}

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

  const isCover = isCoverSec(s);

  if (isCover) {
    // ---------- title（封面卡专属）----------
    const titleInner = pick(s, 'title');
    if (titleInner === null) fail(tag, '封面卡缺少 .title');
    else {
      if (EMOJI.test(titleInner)) fail(tag, '.title 出现 emoji');
      const lines = [...titleInner.matchAll(/<p[^>]*class="[^"]*\btitle-line\b[^"]*"[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
      if (lines.length !== 2) fail(tag, `.title 应固定 2 行 .title-line，实际 ${lines.length} 行`);
      else {
        let total = 0;
        lines.forEach((l, i2) => {
          const w = width(text(l));
          total += w;
          if (w > 8) fail(tag, `.title 第 ${i2 + 1} 行 ${w} 字宽，单行上限 8`);
        });
        if (total > 16) fail(tag, `.title 共 ${total} 字宽，总上限 16`);
      }
    }

    // ---------- intro（封面卡：固定 1 段，不加粗）----------
    const introInner = pick(s, 'intro');
    if (introInner === null) fail(tag, '缺少 .intro');
    else {
      if (/<(ul|ol|table|pre|code|img|strong|em)\b/i.test(introInner)) fail(tag, '.intro 只允许纯 <p>，不许列表/表格/代码块/图片/加粗/斜体');
      if (/<br\s*\/?>/i.test(introInner)) fail(tag, '.intro 不允许手动 <br>');
      if (EMOJI.test(introInner)) fail(tag, '.intro 出现 emoji');
      const ps = [...introInner.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
      if (ps.length !== 1) fail(tag, `封面卡 .intro ${ps.length} 段，应固定 1 段`);
      let lines = 0;
      ps.forEach((p, i2) => {
        const l = Math.ceil(width(text(p)) / 24);
        if (l > 4) fail(tag, `.intro 第 ${i2 + 1} 段 ${l} 行，单段上限 4 行`);
        lines += l;
      });
      if (lines !== 4) fail(tag, `.intro 共 ${lines} 行，应固定 4 行（少于此封面偏空，多于此图片上方留白过挤）`);
    }

    // ---------- photo（仅封面卡）----------
    const photoInner = pick(s, 'photo-frame');
    if (photoInner === null) fail(tag, '封面卡缺少 .photo-frame');
    else {
      const imgs = [...photoInner.matchAll(/<img\b[^>]*src="([^"]*)"/gi)];
      if (imgs.length !== 1) fail(tag, `.photo-frame 应有且只有 1 张 <img>，实际 ${imgs.length} 张`);
      else if (!imgs[0][1] || imgs[0][1].includes('{{')) fail(tag, '.photo-frame 的 <img> 缺少真实 src（还是占位符 {{图片路径}}）');
    }
    if ((s.match(/class="[^"]*\bphoto-frame\b/gi) || []).length > 1)
      fail(tag, '一张卡只能有 1 个 .photo-frame');
  } else {
    // ---------- 内容卡：title 固定 1 行；不许有 photo-frame ----------
    if (/\bphoto-frame\b/.test(s)) fail(tag, '内容卡不许有 .photo-frame，图片只出现在长文模式的封面卡');

    const titleInner = pick(s, 'title');
    if (titleInner === null) fail(tag, '内容卡缺少 .title');
    else {
      if (EMOJI.test(titleInner)) fail(tag, '.title 出现 emoji');
      const lines = [...titleInner.matchAll(/<p[^>]*class="[^"]*\btitle-line\b[^"]*"[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
      if (lines.length !== 1) fail(tag, `内容卡 .title 应固定 1 行 .title-line，实际 ${lines.length} 行`);
      else {
        const w = width(text(lines[0]));
        if (w > 13) fail(tag, `.title ${w} 字宽，单行上限 13`);
      }
    }

    // ---------- intro（内容卡：1–3 段，单段不限长，合计 6–14 行，纯正文）----------
    const introInner = pick(s, 'intro');
    if (introInner === null) fail(tag, '缺少 .intro');
    else {
      if (/<(ul|ol|table|pre|code|img|strong|b|em)\b/i.test(introInner)) fail(tag, '.intro 只允许纯 <p>，不许列表/表格/代码块/图片/加粗/斜体');
      if (/<br\s*\/?>/i.test(introInner)) fail(tag, '.intro 不允许手动 <br>');
      if (EMOJI.test(introInner)) fail(tag, '.intro 出现 emoji');
      const ps = [...introInner.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
      if (ps.length < 1 || ps.length > 3) fail(tag, `内容卡 .intro ${ps.length} 段，应为 1–3 段`);
      const lines = ps.reduce((n, p) => n + Math.ceil(width(text(p)) / 24), 0);
      if (lines < 6) fail(tag, `.intro 共 ${lines} 行，下限 6 行`);
      if (lines > 14) fail(tag, `.intro 共 ${lines} 行，上限 14 行`);
    }
  }
}

// ---------- report ----------

for (const w of warns) console.log(`WARN  ${w}`);
for (const f of fails) console.log(`FAIL  ${f}`);
console.log(`\n${fails.length ? '✗' : '✓'} ${file} — 共 ${N} 张 · FAIL ${fails.length} · WARN ${warns.length}`);
process.exit(fails.length ? 1 : 0);
