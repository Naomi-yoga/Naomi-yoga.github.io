# GitHub Pages 部署说明

个人简历站点为**纯静态**：`index.html` + `content/*.json` + `js/*.js`。访客只能浏览；你通过 **Git 推送**（仅你有仓库写权限）更新内容。

---

## 一、推荐仓库目录结构

在 GitHub 上**单独新建一个仓库**（不要和「工作辅助文档」整库混在一起，避免泄露其它文件）。本地把本文件夹整理成如下结构后整体推送到该仓库根目录：

```text
resume/                          # 仓库根目录（名称见下文）
├── index.html                   # 页面壳（样式、动画、语言切换）
├── GITHUB_PAGES.md              # 本说明
├── content/
│   ├── content.zh.json          # 中文文案与卡片配置（主要改这个）
│   └── content.en.json          # 英文文案（与 zh 结构一致）
├── js/
│   ├── render.js                # 根据 JSON 渲染 Bento 网格
│   └── app.js                   # 语言切换与初始化
└── assets/                      # 可选：头像、截图等
    └── avatar.jpg
```

默认写入 JSON、并会在 **Pages 页面上展示** 的信息：

| 字段 | 值 |
|------|-----|
| 姓名 | 中文「徐辉」/ 英文「Xu Hui」 |
| GitHub | https://github.com/Naomi-yoga |
| 联系说明 | `contact.note`（引导通过 GitHub 联系） |

**联系区默认只显示 GitHub 链接**，不在 JSON 中存放邮箱，以降低公开仓库与爬虫暴露风险。若要在页面上显示邮箱，见下文「隐私与联系方式」。

---

## 二、创建 GitHub 仓库（尚未创建时）

### 方案 A：用户主页（推荐，URL 最短）

1. 登录 GitHub → **New repository**
2. **Repository name** 必须为：`Naomi-yoga.github.io`（与用户名一致）
3. 选 **Public**，不要勾选 “Add a README”（若本地已有文件）
4. Create repository

上线后访问：**https://naomi-yoga.github.io/**

### 方案 B：普通项目页

1. 仓库名随意，例如：`resume`
2. 上线后访问：**https://naomi-yoga.github.io/resume/**  
   （注意路径多一层 `/resume/`）

以下命令以**方案 A** 为例；若用方案 B，把远程地址和 Pages 设置改成对应仓库名即可。

---

## 三、本地初始化并首次推送

在 PowerShell 中进入本项目目录：

```powershell
cd "c:\Work\工作辅助文档\个人简历网站"

git init
git add index.html GITHUB_PAGES.md content js
# 若有 assets：git add assets

git commit -m "feat: bento resume with zh/en JSON content"

git branch -M main
git remote add origin https://github.com/Naomi-yoga/Naomi-yoga.github.io.git
git push -u origin main
```

若仓库已存在且含 README，可先：

```powershell
git pull origin main --rebase
git push -u origin main
```

---

## 四、开启 GitHub Pages

1. 打开仓库 → **Settings** → **Pages**
2. **Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **main** / **/(root)**
3. Save  
4. 等待 1～3 分钟，页面显示绿色 **Your site is live at …**

> 无需 GitHub Actions：静态文件在根目录的 `index.html` 会直接作为首页。

---

## 五、本地预览（必看）

浏览器**不能直接双击** `index.html` 打开（`file://` 下无法 `fetch` JSON）。

在项目目录启动简易服务器：

```powershell
cd "c:\Work\工作辅助文档\个人简历网站"
python -m http.server 8080
```

浏览器打开：**http://localhost:8080/**

---

## 六、如何编辑内容（不写死 HTML）

### 1. 改文案

编辑 `content/content.zh.json` 与 `content/content.en.json` 中对应字段，保持 **key 结构一致**。

- `profile`：姓名、头衔 HTML、头像 URL  
- `cards`：各 Bento 卡片（见下表）  
- `contact.note`：联系区下方灰色说明（如 GitHub 私信指引）  
- `contact.links`：对外链接列表（默认仅 GitHub）  
- `contact.email`（可选，勿提交真实邮箱到公开库，见第七节）  

### 2. 卡片类型 `template`

| template | 用途 | 主要字段 |
|----------|------|----------|
| `text` | 关于我、经历、理念 | `title`, `bodyHtml`（可含 `<span class="gradient-ai">`） |
| `skills` | 技能药丸 | `tags[]`: `{ "label", "variant" }`，variant: `violet` \| `cyan` \| `zinc` \| `emerald` |
| `contact` | 联系我 | 根级 `contact`：`note`、`links`、可选 `email`；卡片项只需 `id` + `title` |

**联系链接规则（`js/render.js`）：**

- `links` 中仅配置要展示的项；`show: false` 的项不渲染。  
- `optional: true` 且 `href` 为空时不渲染（用于占位 Twitter 等）。  
- 也可在 `links` 里直接加 `mailto:` 项（会出现在页面与公开 JSON 中）。  

**可选邮箱（推荐仅本地或接受公开时使用）：**

```json
"contact": {
  "note": "…",
  "email": {
    "address": "your@example.com",
    "label": "邮箱",
    "showOnSite": true
  },
  "links": [ { "type": "github", "label": "GitHub", "href": "https://github.com/Naomi-yoga", "hover": "cyan" } ]
}
```

- `showOnSite: false` 或未写 `email`：页面上**不显示**邮箱。  
- `showOnSite: true`：自动增加邮件图标链接。  
- **推送到 Public 仓库前**：勿把真实邮箱写入会被 push 的 JSON；若曾提交过，删除后旧 commit 仍可能保留，需轮换邮箱或清理 Git 历史。

### 3. 布局

- `gridClass`：如 `"md:col-span-2"`、`"md:col-span-3"`（Tailwind，仅桌面多列）  
- `delay`：入场动画延迟，如 `"0.4s"`  

### 4. 增删卡片

- **删除**：在 `cards` 数组中删掉对应对象，两个语言文件都删同一 `id`。  
- **新增**：复制一段同类型卡片，改 `id`、`delay`，同步中英文 JSON。  

头像：在 `profile` 中设置 `"avatarUrl": "assets/avatar.jpg"`，并把图片放入 `assets/`。

### 5. 发布更新

```powershell
git add content
git commit -m "content: update resume"
git push
```

Pages 会在 push 后自动刷新（稍等片刻）。

---

## 七、隐私与联系方式

### 页面上展示什么

| 内容 | 默认行为 |
|------|----------|
| 姓名、GitHub | 在 JSON 与 Pages 上公开，符合简历用途 |
| 邮箱 | **默认不出现**；联系卡片仅 GitHub + `contact.note` 说明 |
| Twitter / 其它 | 仅在 `contact.links` 中自行添加；勿留空 `href` 的占位链接 |

### 推送到 GitHub 会暴露什么

- **Public 仓库**：任何人可阅读 `content/*.json` 全文及历史提交；Pages 同样会提供 JSON 的 URL（F12 可见）。  
- **写在 JSON 里的邮箱** = 进入版本库，可能被垃圾邮件爬虫收录；与写在 HTML 里等价。  
- **当前仓库默认 JSON 不含邮箱字段**；你可在本地加 `contact.email` 预览，推送前删除或保持 `showOnSite: false` 且不提交含真实地址的 commit。  

### 若要在网站上显示邮箱

1. 在本地 JSON 增加 `contact.email` 并设 `"showOnSite": true`（见第六节示例）。  
2. 确认接受公开后再 `git push`。  
3. 更稳妥的做法：只在 GitHub 个人资料填写邮箱、或仅用 `contact.note` 引导访客通过 GitHub 联系。

### 权限（仅你可改、他人只读）

| 角色 | 能力 |
|------|------|
| 你（仓库 Owner） | `git push` 修改 JSON/HTML；或 GitHub 网页编辑文件 |
| 访客 | 仅 HTTPS 浏览，无后台、无 API 写权限 |

若需「网页上可视化编辑」，需另做带登录的 admin（例如私有 Vercel + 认证，或 GitHub OAuth + PR），本阶段未包含。

---

## 八、常见问题

**Q: 切换语言后部分内容没变？**  
A: 中英文各用独立 JSON，需分别改 `content.zh.json` 与 `content.en.json`。

**Q: 页面一直「加载中」或报错？**  
A: 未用 HTTP 访问、或 JSON 语法错误（少逗号）。用浏览器 F12 → Network 查看 `content.*.json` 是否 200。

**Q: 想用自定义域名？**  
A: Pages 设置里填 Custom domain，并在域名 DNS 添加 CNAME 指向 `Naomi-yoga.github.io`。

**Q: 联系区为什么没有邮箱？**  
A: 默认为隐私考虑只展示 GitHub。需要时在 JSON 中配置 `contact.email` 且 `showOnSite: true`，或仅在 `links` 中添加 `mailto:`（会进入公开仓库）。

---

## 九、与父目录 Git 的关系

当前父路径 `C:\Work\工作辅助文档` 若已是 Git 仓库，建议：

- **为本简历单独 `git init` 在本文件夹**，只关联 `Naomi-yoga.github.io` 远程；或  
- 使用 `git subtree` / 子模块将本目录推到 Pages 仓库，避免把整个「工作辅助文档」公开。

公开仓库前请确认未提交敏感文件。