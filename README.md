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
