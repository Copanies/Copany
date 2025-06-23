# Copany App

一个基于 Next.js 和 Supabase 的现代 Web 应用。

## 🚀 快速开始

### 1. 环境变量配置

在项目根目录创建 `.env.local` 文件：

```bash
# Supabase 配置 - 只需要 anon key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# 可选：网站 URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### 如何获取 Supabase Anon Key：

1. 登录到 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 **Settings** → **API**
4. 复制 **anon** key 到 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🏗️ 架构说明

- **简化配置**：只使用 Supabase anon key，无需 service role key
- **分层架构**：数据服务层、认证操作层、视图组件层
- **安全考虑**：anon key 权限受限，适合客户端使用

## 📋 功能特性

- ✅ GitHub OAuth 登录
- ✅ 用户信息显示
- ✅ 公司列表查看
- ✅ SSR 和客户端状态管理

## 🔧 技术栈

- **前端**：Next.js 14 (App Router)
- **数据库**：Supabase
- **认证**：Supabase Auth (GitHub OAuth)
- **样式**：Tailwind CSS
- **类型**：TypeScript

## 📁 项目结构

```
src/
├── app/                 # Next.js 页面
├── components/          # React 组件
├── services/            # 数据服务层
├── actions/             # Server Actions
└── utils/               # 工具函数
```

详细架构说明请查看 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## GitHub 认证与 Token 持久化

### 概述

本应用使用 Supabase OAuth 进行 GitHub 登录，并将 GitHub access token 持久化到 Cookie 中，以支持服务端渲染 (SSR) 场景下的 API 调用。

### 实现机制

#### 1. 登录流程

- 用户通过 `signInWithGitHub()` 函数发起 GitHub OAuth 登录
- OAuth 回调处理 (`/auth/callback`) 将 `provider_token` 保存到 HttpOnly Cookie
- Cookie 设置：
  - 名称：`github_access_token`
  - HttpOnly：true（防止 XSS 攻击）
  - Secure：生产环境为 true
  - SameSite：lax
  - 有效期：7 天

#### 2. Token 获取策略

`getGithubAccessToken()` 函数采用以下优先级策略：

1. 首先尝试从 Supabase session 获取 `provider_token`
2. 如果 session 中没有 token，则从 Cookie 中读取
3. 当从 session 获取到 token 时，自动更新 Cookie

#### 3. 登出流程

- `signOut()` 函数会同时清除 Supabase session 和 Cookie
- 确保完全清理用户认证状态

#### 4. SSR 支持

- 在 SSR 场景下，即使 Supabase session 不可用，也能从 Cookie 读取 token
- 支持在 `getRepoReadme()` 等服务端函数中访问 GitHub API

### 使用示例

```typescript
// 在 SSR 组件中使用
export default async function MyComponent() {
  const readme = await getRepoReadme("owner/repo");
  // 函数会自动处理 token 获取，无论是从 session 还是 Cookie
  return <div>{readme && atob(readme.content)}</div>;
}
```

### 安全考虑

- 使用 HttpOnly Cookie 防止客户端 JavaScript 访问 token
- Cookie 在生产环境中仅通过 HTTPS 传输
- Token 有效期限制为 7 天，需要重新登录刷新

### 注意事项

- Cookie 只能在 Server Action 或 Route Handler 中修改，页面组件中无法修改
- GitHub API 调用需要完整的 "owner/repo" 格式路径
- 系统会自动从 `github_url` 字段解析出正确的仓库路径格式
