# 贡献指南

> [English](https://github.com/Copanies/Copany/blob/main/CONTRIBUTING.md) | 中文版本

本指南帮助你在本地搭建完整的 Supabase 开发环境，并连接前端项目进行调试。

## 如何贡献

**一、创建 Issue 并完成任务**

1. **开启讨论：**
   建议在创建 Issue 或开始工作前，先发起一次讨论，与其他成员充分交流想法。
2. **创建 Issue：**
   讨论达成共识后，创建一个或多个 Issue，指定负责人并设置复杂度分级。
3. **提交审核：**
   任务完成后，将 Issue 状态切换为 In Review，由 Copany 负责人审核完成内容及分级是否合理。
4. **确认完成：**
   审核通过后，将状态切换为 Done。成果（代码或设计等）合并至主分支，Issue 负责人将获得对应分级的贡献积分。

**二、申请现有 Issue 并完成**

1. 在合作区浏览当前已规划的 Issue，查看其内容、优先级与复杂度分级。

2. 在 Issue 的 Assignee 选项中，申请将自己分配为负责人。

3. 待 Copany 负责人、Issue 负责人或创建者审核通过后，即可开始执行任务。

4. 任务完成与审核流程同「创建 Issue 并完成」步骤一致。

## 开发环境搭建

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

# Google OAuth 配置
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE

# Figma OAuth 配置
NEXT_PUBLIC_FIGMA_CLIENT_ID=YOUR_FIGMA_CLIENT_ID_HERE
FIGMA_CLIENT_SECRET=YOUR_FIGMA_CLIENT_SECRET_HERE

# 支付链接加密密钥 (32字节十六进制格式)
# 生成命令: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AES_KEY=YOUR_32_BYTE_HEX_KEY_HERE
```

## 4.1. OAuth 配置指南（可选）

### GitHub OAuth 设置

1. **创建 GitHub OAuth 应用：**

   - 访问 [GitHub 设置 > 开发者设置 > OAuth Apps](https://github.com/settings/developers)
   - 点击 "New OAuth App"
   - 填写信息：
     - **应用名称**：你的应用名称
     - **主页 URL**：`http://localhost:3000`
     - **授权回调 URL**：`http://127.0.0.1:54321/auth/v1/callback`

2. **获取凭据：**

   - 从你的 OAuth 应用中复制 **Client ID** 和 **Client Secret**
   - 更新环境变量：
     ```env
     SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=your_github_client_id
     SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=your_github_client_secret
     ```

3. **不配置 GitHub OAuth 的影响：** 无法使用 GitHub 登录。

### Google OAuth 设置

1. **创建 Google OAuth 应用：**

   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 创建新项目或选择现有项目
   - 启用 Google+ API
   - 进入"凭据" > "创建凭据" > "OAuth 2.0 客户端 ID"
   - 填写信息：
     - **应用类型**：Web 应用
     - **授权重定向 URI**：`http://127.0.0.1:54321/auth/v1/callback`

2. **获取凭据：**

   - 复制 **Client ID** 和 **Client Secret**
   - 更新环境变量：
     ```env
     NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
     GOOGLE_CLIENT_SECRET=your_google_client_secret
     ```

3. **不配置 Google OAuth 的影响：** 无法使用 Google 登录。

### Figma OAuth 设置

1. **创建 Figma 应用：**

   - 访问 [Figma 开发者设置](https://www.figma.com/developers/apps)
   - 点击 "Create new app"
   - 填写信息：
     - **应用名称**：你的应用名称
     - **重定向 URI**：`http://127.0.0.1:54321/auth/v1/callback`

2. **获取凭据：**

   - 从你的 Figma 应用中复制 **Client ID** 和 **Client Secret**
   - 更新环境变量：
     ```env
     NEXT_PUBLIC_FIGMA_CLIENT_ID=your_figma_client_id
     FIGMA_CLIENT_SECRET=your_figma_client_secret
     ```

3. **不配置 Figma OAuth 的影响：** 无法使用 Figma 登录。

## 5. 启动前端服务

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 5.1. 本地构建测试（可选）

如需测试生产环境构建：

```bash
./build.local.sh
```

这将构建项目并启动本地生产服务器进行测试。

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
- 管理员会在发布周期中将迁移应用到线上数据库。

---

感谢你的贡献！如遇问题请提交 Issue 或联系维护者。
