---
name: social-post-card
description: Use when the user wants text turned into 3:4 social-media cards with a profile header (avatar, name, verified badge, bio). Two modes — single-page short share (one text card the user wrote; only proofread format and trim to fit) or long-form share (cover card with 2-line headline, 4-line intro and one photo, plus one text-only chapter card per outline chapter, written from the user's outline into a 总分 structure). Triggers on 社交媒体卡片, 头像卡片, 短分享, 单页卡片, 长文卡片, 分章节卡片, 大纲做成卡片, 发一张图片卡, social post card. Not for free-form multi-photo carousels.
---

# Social Post Card

1080×1440（3:4）社交卡片。两种卡、两种出图模式：

| 模式 | 组成 | 用户给什么 | 我做什么 |
| --- | --- | --- | --- |
| **单页短分享** | 1 张内容卡 | 成品文字 | 校对格式、超限删减、出图 |
| **长文分享** | 1 张封面卡 + N 张章节卡（N ≥ 1） | 大纲 + 事例 + 1 张封面配图 | 写成总分结构的文章、压成卡、出图 |

- **内容卡**：头部 + 1 行标题 + 1–3 段纯正文（合计 6–14 行），不配图、不加粗。单页模式的那张卡
  和长文的章节卡是同一种卡。
- **封面卡**：头部 + 2 行大标题 + 4 行正文 + 1 张 2:1 配图，只在长文模式出现。

版式参数全部写死在模板里，自由度只有：文案、封面配图、accent 强调色（橙/蓝）。
**风格**：白底、圆角、头像+认证图标+bio 的社交 App 卡片观感。

## Required Reading

- `references/layout-spec.md` —— **全部硬性数值**（字宽、行数、尺寸、比例）。本文件不重复这些数字。
- `references/content-extraction.md` —— **文案怎么写**（单页校对边界、长文写作、文风、自检）。

`<skill>` 指本 skill 的安装目录（个人级通常是 `~/.claude/skills/social-post-card`）。

## Step 0：判断模式

- 用户给一段写好的短内容、说"发一张""短分享" → **单页模式**。
- 用户给大纲/分章节内容、说"长文""分章节" → **长文模式**。
- 判断不了才问一句，不要两种都做。

账号身份和 accent 颜色都有默认值（固定账号、橙色），不用问、也不要主动建议换，改法见 B1。

## 单页模式

用户的文字就是成品，**不写文章、不出确认 md，直接排版出图**。

1. **校对**：按 `content-extraction.md` §1 直接改格式和标点，超 14 行或标题超 13 字宽直接删到
   合规。不足 6 行不补写，告诉用户差几行、等用户补。
2. **出图**：走 Phase B。模板里删掉封面卡 section，留 1 张内容卡，`id="p01"`，页码 `01 / 01`。
3. **交付**：PNG 路径 + 改动清单（格式改了什么、删了哪几句原文、标题是否为我拟的）。

## 长文模式

分两段：**Phase A 写内容**，产出一份用户确认过的 md；**Phase B 出图**。中间是硬关卡——
Phase A 没拿到用户确认，不进 Phase B。

### A1. 收大纲

用户给的大纲应包含：主论点、各章要点、各章事例。缺主论点或某章没有事例时，**先问清楚再写**，
不要自己补。顺带确认封面配图有没有准备好（没有也可以先写，出图前再要）。

章数 = 大纲章数 = 章节卡张数，总张数 = 章数 + 1。

### A2. 写文章（不许跳过）

按 `content-extraction.md` §2 写成一篇总分结构的完整文章：开篇总论 + 一章一个小标题。
每章 论点 → 事例 → 结论，论据只用大纲里的，缺的用 `【缺论据：……】` 标出。
**这一步不考虑卡片、不数字数、不管行数。**

### A3. 压成卡

按 `content-extraction.md` §3–§4：开篇总论压成封面（2 行标题 + 4 行 intro），每章压成一张
章节卡（1 行标题 + 1–3 段、6–14 行），超了直接删到合规。数值对照 `layout-spec.md`。

### A4. 通读自检

按 `content-extraction.md` §6 逐项通读，改完重过一遍直到清零。字宽、行数等机器能查的不用
人工核对，B2 会拦截。

### A5. 写入桌面 md，等用户确认

写一个文件 `~/Desktop/<任务名>.md`，两部分：

1. **卡片稿**（放前面，用户主要看这部分）：封面标题 + intro，每张章节卡的标题 + 正文，按页码顺序。
2. **文章原文**（放后面）：A2 的完整文章，方便对照删了什么；`【缺论据】` 标记在这里。

把路径告诉用户，并单独列出所有 `【缺论据】`。**拿到明确确认之前不进 Phase B。** 用户改了文件
或提意见，回到 A4 自检、重写同一个文件，直到用户说可以。

## Phase B：出图（两种模式共用）

### B1. 复制模板并填内容

```bash
mkdir -p <任务目录>
cp <skill>/assets/template-post-card.html <任务目录>/index.html
```

长文模式的文案来自用户确认过的 md，这一步不再改文案。封面配图放进 `<任务目录>`（或用绝对
路径）。在 `index.html` 里：

1. 改 `<title>`。
2. **账号身份**：模板已绑定固定账号，默认不动。只有用户明确要换身份时才改 `:root` 的
   `--account-avatar` / `--account-name` / `--account-bio` 三行。
3. **accent 颜色**：`<body>` 默认 `class="accent-orange"`，用户明确要蓝色才换成 `accent-blue`。
4. 组卡：
   - 单页：删掉 `<section class="poster cover" id="p01">` 整段，内容卡 `id` 改为 `p01`，页码 `01 / 01`。
   - 长文：封面卡保留（带 `.cover`，只此一张）；内容卡按章数复制，`id` 依次 `p02` / `p03` …，
     页码 `当前页 / 总张数`。
5. 填内容：封面卡填 2 行 `.title-line`、`.intro` 1 段、`.photo-frame` 里 `<img>` 的 `src`；
   内容卡填 1 行 `.title-line` + `.intro` 的 1–3 个 `<p>`，纯文本，不加 `<strong>`。

配图比例接近 2:1 即可，模板会拉伸铺满 920×460；明显偏离（竖图、正方形）时提醒用户会变形，
问要不要先裁一版。

不要改 `<style>` 块，不要新增 class（`.cover` 是模板自带的），不要写 inline 样式。

### B2. 静态检查

```bash
node <skill>/scripts/check-cards.mjs <任务目录>/index.html
```

校验模式组合（单页 1 张无封面 / 长文封面 + ≥1 章节卡）、账号配置、accent、认证图标、页码、
标题行数与字宽、正文段数与行数、禁止加粗/emoji/inline 样式等全部硬约束。**FAIL 必须清零再
渲染**，清零的办法是改文案，不是改模板。

行数按 `ceil(字宽 ÷ 24)` 估算，实际渲染可能因标点避头尾多出一行——所以 B3 必须看图。

### B3. 渲染并看图

```bash
node <skill>/scripts/render.mjs <任务目录>
```

无依赖，调本机 headless Chrome，逐个 `section.poster` 导出 1080×1440 PNG。
**默认导出到桌面** `~/Desktop/<任务目录名>/`，文件名 `01-p01.png`、`02-p02.png`…。
想放别处用 `--out <目录>`；Chrome 不在默认位置用 `CHROME_PATH=<路径>`。

渲染完用 Read 逐张看 PNG：正文有没有溢出画布、图片拉伸是否明显变形、底部留白是否合理。
有问题回去改文案，重新 B2 → B3。

### B4. 交付

把 PNG 绝对路径贴给用户；单页模式附改动清单。**不要自动二次修改**，等用户反馈。

## Non-Negotiables

1. **版式写死。** 溢出/欠填只能改文案，不许改字号、行高、padding、图片尺寸，不许加 class
   或 inline 样式。
2. **单页不改写。** 只动格式、标点、错别字，超限只整句删；不改用词、不补句子。
3. **长文先有文章。** 卡片只能从 A2 的文章压缩而来，不许看完大纲直接填卡片槽位。
4. **长文 md 关卡不能跳。** 拿到用户确认才进 Phase B。
5. **论据不编造。** 只用用户给的事例，缺了就标出来问。
6. **产物落地位置**：`index.html`、配图放任务目录，md 和 PNG 放桌面，都不许落在 skill 目录里。

## Files

| 文件 | 用途 |
| --- | --- |
| `references/layout-spec.md` | 全部硬性数值。动手前必读 |
| `references/content-extraction.md` | 文案写法：单页校对、长文写作、文风、自检 |
| `assets/template-post-card.html` | 自包含 seed，复制成任务目录的 `index.html` |
| `scripts/check-cards.mjs` | 渲染前的静态约束检查器 |
| `scripts/render.mjs` | 无依赖导出器，headless Chrome 逐页截 1080×1440 PNG |
