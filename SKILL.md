---
name: social-post-card
description: Use when the user wants a short social-media post turned into one or more image cards, each with a profile header (avatar, name, verified badge, bio), 1–2 short paragraphs, and one photo. Triggers on 社交媒体卡片, 头像卡片, 短文案配图, 发一张图片卡, social photo card, quote card with photo. Not for long articles with chapter structure (use convert-article-to-cards) or free-form multi-photo carousels.
---

# Social Post Card

把一段短文案 + 一张图片做成 `.profile-head + intro + photo` 三段式卡片，1080×1440（3:4）。
一次可以出多张（批量发图场景），每张卡结构完全同构，只有文案、图片、页码不同。
排版参数写死：头部固定 152px，图片固定 920×460（2:1），正文行数固定 7–10 行区间。
你唯一的自由度是文案怎么写和传哪张图。

**风格**：白底、圆角、头像+认证图标+bio 的社交 App 卡片观感，不是 Swiss 版式，不做 accent 切换。

## When To Use

用：用户要发的是**短内容**——一段观点/感想/产品截图配文这类，天然配一张图，不需要按章节切分。

不用：
- 长文章、有章节结构的内容 → 用 `convert-article-to-cards`。
- 图后面还要接大段文字、或一张卡要放多张图 → 这个 skill 不做，见 Non-Negotiables。

## Required Reading

**动手前必读 `references/layout-spec.md`。** 全部硬性数值（字数区间、行数区间、图片比例）都在那里，本文件只讲流程。

## Workflow

下面的 `<skill>` 指本 skill 的安装目录（个人级通常是 `~/.claude/skills/social-post-card`）。

### 1. 确认素材

模板默认绑定了固定账号（头像 `assets/account/avatar.jpg`，昵称"未来的哇咔咔"，bio"专注于需求研究、
副业机会分析"），不用每次都问。只有用户明确要换账号身份时才需要改 `:root` 里的三行配置
（见 Step 3），否则跳过这步。

问清楚：
- 要出几张卡、每张卡的文案和对应的图片

图片比例接近 2:1 即可，不需要用户自己裁好——模板会直接拉伸铺满 920×460，偏离越大拉伸感越明显，
偏离很大（竖图、正方形）时提醒用户效果会变形，问要不要先裁一版。

### 2. 写文案，对照行数区间

打开 `references/layout-spec.md`，intro 按 **7–10 行**写，一段或两段都可以，不强制写满上限。
昵称 ≤10 字宽，bio ≤22 字宽。1–2 段，单段 ≤6 行。**每段第一句是总结句，用 `<strong>` 包住**（加粗+下划线），
读者扫一眼加粗句就懂这段在说什么，后面才是展开。

改写原意，不要为了凑行数编内容。

### 3. 复制模板并填内容

```bash
mkdir -p <任务目录>
cp <skill>/assets/template-post-card.html <任务目录>/index.html
```

把用户提供的头像、图片文件也放进 `<任务目录>`（或用它们的绝对路径），在 `index.html` 里：

1. 改 `<title>`。
2. **账号身份默认已经填好**（Step 1 里那个固定账号），不用动。只有换账号才改 `<style>` 里
   `:root` 的 `--account-avatar` / `--account-name` / `--account-bio` 三行——整批卡片共用这一份配置，
   不用逐张卡重复填。
3. 复制 `<section class="poster" id="p01">` 到需要的张数，`id` 依次 `p01` / `p02` …
4. 每份只填这张卡自己的内容：`.page-index` 页码（`当前页 / 总张数`，如 3 张就是
   `01 / 03` `02 / 03` `03 / 03`）、`.intro` 里的 1–2 段文案、`.photo-frame` 里 `<img>` 的 `src`。

不要改 `<style>` 块，不要新增 class，不要写 inline `font-size` / `font-weight`（模板会画红框）。

### 4. 静态检查（渲染前）

```bash
node <skill>/scripts/check-cards.mjs <任务目录>/index.html
```

检查 `:root` 里头像/昵称/bio 配置是否还是占位符、认证图标是否存在、intro 段落数与行数区间、
页码格式与张数是否一致、图片是否还是占位符 `{{...}}`。**FAIL 必须清零再渲染。**

### 5. 渲染

```bash
node <skill>/scripts/render.mjs <任务目录>
```

无依赖，直接调本机 headless Chrome，逐个 `section.poster` 导出 1080×1440 PNG。
**默认导出到桌面**：`~/Desktop/<任务目录名>/`，文件名 `01-p01.png`、`02-p02.png`…，与页码一致。
没有桌面目录的环境会退回 `<任务目录>/out/`。

- 想放别处：`--out <目录>`。
- Chrome 不在默认位置：`CHROME_PATH=<路径>`。

渲染完自己看一遍 PNG：图片拉伸有没有明显变形、bio 有没有被压扁、底部留白是否合理。

### 6. 交付

把渲染结果用绝对路径贴给用户看。**不要自动跑二次校验、不要自动改动**，等用户反馈。

## Non-Negotiables

1. 一张卡只有三个内容区块：头部、intro、图片。不加第四个，不在图片下方接正文。
2. 每张卡固定 1 张图片，不放第二张。
3. 认证图标固定显示，不做可选开关。
4. 图片比例固定 2:1，拉伸铺满，不裁切、不改比例。
5. 页码格式固定 `当前页 / 总张数`，按实际批量张数填，不编。
6. 版式参数写死在模板里。溢出/欠填只能改文案，不许改字号、行高、padding、图片尺寸。
7. 不放 emoji、装饰色块。
8. `index.html`、头像、图片放任务目录，PNG 放桌面。都不许落在 skill 目录里。

## Files

| 文件 | 用途 |
| --- | --- |
| `references/layout-spec.md` | 全部硬性数值。动手前必读 |
| `assets/template-post-card.html` | 自包含 seed，复制成任务目录的 `index.html` |
| `scripts/check-cards.mjs` | 渲染前的静态约束检查器 |
| `scripts/render.mjs` | 无依赖导出器，headless Chrome 逐页截 1080×1440 PNG |
