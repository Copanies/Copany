# Copany App 架构文档

## 架构模式

采用**分层架构**模式，实现关注点分离和数据驱动的设计。

## 文件结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── page.tsx           # 页面组件（数据获取层）
│   └── layout.tsx         # 布局组件
├── components/            # UI 组件（纯渲染层）
│   └── CopanyListView.tsx # 列表视图组件
├── services/              # 业务逻辑层
│   └── copany.service.ts  # Copany 数据服务
├── actions/               # Server Actions
│   └── auth.actions.ts    # 认证操作
├── lib/                   # 工具库
│   └── supabase.ts        # Supabase 客户端配置
└── hooks/                 # 自定义 Hooks（可选）
    └── useCopanies.ts     # 客户端状态管理示例
```

## 分层说明

### 1. 数据层 (Data Layer)

- **位置**: `src/lib/supabase.ts`
- **职责**: 数据库连接配置
- **特点**: 区分服务端和客户端连接

### 2. 业务逻辑层 (Service Layer)

- **位置**: `src/services/`
- **职责**: 封装所有业务逻辑和数据操作
- **特点**: 静态方法，可复用，错误处理

### 3. 操作层 (Actions Layer)

- **位置**: `src/actions/`
- **职责**: Server Actions，处理用户交互
- **特点**: `"use server"` 指令，服务端执行

### 4. 页面层 (Page Layer)

- **位置**: `src/app/page.tsx`
- **职责**: 数据获取和页面布局
- **特点**: 服务端组件，负责数据编排

### 5. 视图层 (View Layer)

- **位置**: `src/components/`
- **职责**: 纯渲染组件
- **特点**: 接收 props，无业务逻辑
