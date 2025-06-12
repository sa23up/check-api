# Google Gemini API 密钥批量检测器

这是一个专用于批量检测 Google Gemini API 密钥（通常在 Google AI Studio 中生成）是否有效的 Web 应用。它由一个极简的静态前端和一个健壮的 Cloudflare Worker 后端构建而成，可以轻松地免费部署到 Cloudflare Pages。

## 功能

-   简洁的用户界面，可一次性输入多个 Gemini API 密钥。
-   通过 Cloudflare Worker 在后端进行安全的 API 调用。
-   实时显示每个密钥的检测状态（有效、无效、检测中）。
-   代码经过简化和加固，确保在 Cloudflare 环境中稳定运行。

## 项目结构

```
.
├── functions
│   └── check.js      # Cloudflare Worker 后端逻辑
├── index.html        # 前端页面结构
├── script.js         # 前端交互逻辑
├── style.css         # 前端样式
└── README.md         # 本文件
```

## 部署到 Cloudflare Pages

您可以免费将此应用部署到 Cloudflare 的全球网络上。

### 准备工作

1.  **一个 Cloudflare 账户**: 如果您还没有，可以在 [Cloudflare 官网](https://dash.cloudflare.com/sign-up) 免费注册。
2.  **Git 和一个 GitHub 账户**: 您需要将代码推送到一个 GitHub 仓库。

### 部署步骤

1.  **创建 GitHub 仓库**:
    -   在 GitHub 上创建一个新的仓库。
    -   将本项目中的所有文件 (`index.html`, `style.css`, `script.js`, `README.md` 和 `functions` 目录) 推送到您的新仓库。

2.  **创建 Cloudflare Pages 项目**:
    -   登录到您的 Cloudflare 仪表板。
    -   在左侧导航栏中，转到 **Workers & Pages**。
    -   点击 **Create application** > **Pages** > **Connect to Git**。
    -   选择您刚刚创建的 GitHub 仓库，然后点击 **Begin setup**。

3.  **配置构建设置**:
    -   **Project name**: 给您的项目起一个名字。
    -   **Production branch**: 选择您的主分支（通常是 `main` 或 `master`）。
    -   **Build settings**: 对于此项目，您**不需要**配置任何构建设置。将该部分留空即可。
    -   **Root directory**: 确保此项设置为仓库的根目录（即 `/`）。

4.  **部署**:
    -   点击 **Save and Deploy**。
    -   Cloudflare 将从您的 GitHub 仓库拉取代码，并自动部署静态文件和位于 `functions` 目录下的 Worker。
    -   部署过程通常需要一到两分钟。

5.  **完成!**
    -   部署完成后，Cloudflare 会为您提供一个唯一的 `.pages.dev` 域名。
    -   访问这个 URL，您就可以开始使用您的 Gemini API 密钥检测器了！