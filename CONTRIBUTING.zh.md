# 贡献指南

> [English](https://github.com/Copanies/Copany/blob/main/CONTRIBUTING.md) | 中文版本

本指南帮助你在本地搭建完整的 Supabase 开发环境，并连接前端项目进行调试。

## 1. 安装 Docker

👉 [https://www.docker.com/](https://www.docker.com/)

## 2. 安装 Supabase CLI

👉 [https://supabase.com/docs/guides/local-development](https://supabase.com/docs/guides/local-development)

```bash
npm install -g supabase
```

## 3. 启动 Supabase 本地服务

```bash
npx supabase start
```

启动成功后会显示如下信息：

```
        API URL: http://127.0.0.1:54321
    GraphQL URL: http://127.0.0.1:54321/graphql/v1
 S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
         DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
     Studio URL: http://127.0.0.1:54323
   Inbucket URL: http://127.0.0.1:54324
     JWT secret: XXXXXX
       anon key: XXXXXX
service_role key: XXXXXX
  S3 Access Key: XXXXXX
  S3 Secret Key: XXXXXX
      S3 Region: local
```

## 4. 创建环境变量文件

在项目根目录创建 `.env.local` 文件，并填入以下内容：

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=XXXXXX
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=XXXXXX

# GitHub OAuth 配置
# 以下为 Copany-dev (测试用 GitHub OAuth App)，也可自己创建一个 GitHub OAuth App 进行测试
SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=Ov23liDG2Vih89RwzedN
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=36e167a99f9f9cdcae7f4c9a3937303b9de221dd

# 支付链接加密密钥 (32字节十六进制格式)
# 生成命令: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AES_KEY=YOUR_32_BYTE_HEX_KEY_HERE
```

## 5. 启动前端服务

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 6. 使用 Supabase Studio 管理数据库

访问 [http://127.0.0.1:54323](http://127.0.0.1:54323)  
更多内容参见：[https://supabase.com/docs/reference/cli/introduction](https://supabase.com/docs/reference/cli/introduction)

## 7. 生成迁移文件

在修改数据库结构后运行：

```bash
npx supabase db diff -f <迁移名称>
```

以便追踪更改并用于上线部署。

## 8. 遵循 Git 工作流

贡献代码请遵循如下流程：

1. **基于 main 或 develop 分支新建功能分支：**

```bash
git checkout -b feature/你的功能名
```

2. **开发与本地测试**

3. **提交更改并写清楚 commit 信息：**

```bash
git add .
git commit -m "feat: 添加了 XXX 功能"
```

4. **推送分支到远程仓库：**

```bash
git push origin feature/你的功能名
```

5. **在 GitHub 上提交 Pull Request 并请求审阅**

## 9. 代码审查与上线

- 所有改动需通过 PR 合并。
- CI/CD 会自动运行测试与迁移检查。
- 管理员会在发布周期中将迁移应用到线上数据库。

---

感谢你的贡献！如遇问题请提交 Issue 或联系维护者。
