# 简历模块说明

## 当前已上线模块

| 模块 | JSON / 模板 | 说明 |
|------|-------------|------|
| 个人资料 | `profile` | 姓名、头衔 HTML、头像 |
| 关于我 | `cards` → `text` | 长文案 |
| 核心技能 | `cards` → `skills` + `tags[]` | 多卡片药丸标签 |
| **工作经历** | `workExperience[]` + `cards` → `work` | 公司已替换原「高光经历」单段文本 |
| 项目作品 | `projects[]` + `cards` → `projects` | 名称、技术栈、链接、简介 |
| AI 编程理念 | `cards` → `text` | |
| 教育背景 | `education[]` + `cards` → `education` | 可在卡片上 `enabled: false` 隐藏 |
| 联系我 | `contact` + `cards` → `contact` | GitHub + note |

## 常见简历仍缺、可按需添加的模块

| 建议模块 | 实现方式 | 优先级 |
|----------|----------|--------|
| 证书 / 认证 | 新建 `certifications[]` + `template: "certs"` | 中 |
| 开源贡献 | 链到 GitHub API 或手写 `highlights[]` | 低 |
| 语言能力 | `languages[]` 药丸或列表 | 中 |
| 下载 PDF | `profile.resumePdfUrl` + 按钮卡片 | 高（求职常用） |
| 博客 / 文章 | `posts[]` 或外链 Notion | 低 |
| 地理位置 / 时区 | `profile.location` | 低 |
| 求职状态 | `profile.openToWork` 一句 | 中 |
| 关键词 SEO | 已有 `meta`；可扩展 JSON-LD | 低 |

在 `cards` 中增删条目即可调整首页布局；列表型模块在 JSON 根级维护数组。

## 管理后台

- 地址：`/admin.html`（勿在公开场合分发密码）
- 配置：复制 `admin-config.example.js` → `admin-config.js`（已 gitignore）
- 能力：各模块增删改、发布到 GitHub（需 PAT `repo` 或 `public_repo`）

详见 `GITHUB_PAGES.md` 第十节。