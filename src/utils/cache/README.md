# 通用缓存管理器

这个缓存系统提供了一个通用的、类型安全的缓存管理器，可以用于缓存任何类型的数据。

## 特性

- 🔧 **类型安全**: 完全支持 TypeScript 泛型
- ⚡ **高性能**: 基于 localStorage 的持久化缓存
- 🕒 **TTL 支持**: 自动过期和清理
- 📊 **详细日志**: 完整的缓存操作日志
- 🔑 **灵活键生成**: 支持自定义键生成策略
- 📈 **统计信息**: 内置缓存统计功能

## 📁 文件结构

```
src/utils/cache/
├── CacheManager.ts     # 🏗️ 通用缓存管理器核心类
├── instances.ts        # 🎯 预定义的缓存实例
├── index.ts           # 📦 统一导出入口
└── README.md          # 📚 使用文档
```

## 基本用法

### 导入缓存实例

```typescript
import { copanyCache, issuesCache, readmeCache } from "@/utils/cache";
```

### 使用现有缓存实例

```typescript
// Copany 缓存
const copany = copanyCache.get("copany-id");
copanyCache.set("copany-id", copanyData);

// Issues 缓存
const issues = issuesCache.get("copany-id");
issuesCache.set("copany-id", issuesArray);

// README 缓存
const readme = readmeCache.get("https://github.com/user/repo");
readmeCache.set("https://github.com/user/repo", readmeContent);
```

## 创建自定义缓存

### 基本示例

```typescript
import { CacheManager } from "@/utils/cache";

// 创建用户缓存
const userCache = new CacheManager<User, string>({
  keyPrefix: "user_cache_",
  ttl: 15 * 60 * 1000, // 15分钟
  loggerName: "UserCache",
});

// 使用缓存
userCache.set("user-123", userData);
const user = userCache.get("user-123");
```

### 高级示例：自定义键生成器

```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

const profileCache = new CacheManager<
  UserProfile,
  { userId: string; version: number }
>(
  {
    keyPrefix: "profile_cache_",
    ttl: 30 * 60 * 1000, // 30分钟
    loggerName: "ProfileCache",
  },
  // 自定义键生成器
  (key) => `${key.userId}_v${key.version}`,
  // 自定义日志信息
  (data) => ({ userName: data.name, userEmail: data.email })
);

// 使用
profileCache.set({ userId: "123", version: 2 }, profileData);
const profile = profileCache.get({ userId: "123", version: 2 });
```

## API 参考

### CacheManager 构造函数

```typescript
constructor(
  config: CacheConfig,
  keyGenerator?: KeyGenerator<K>,
  logInfoGenerator?: LogInfoGenerator<T>
)
```

### 配置选项 (CacheConfig)

- `keyPrefix`: 缓存键前缀
- `ttl`: 缓存时间（毫秒）
- `loggerName`: 日志标识名称

### 主要方法

- `set(key: K, data: T): void` - 设置缓存
- `get(key: K): T | null` - 获取缓存
- `clear(key?: K): void` - 清除缓存
- `has(key: K): boolean` - 检查缓存是否存在
- `getStats(): { count: number; totalSize: number }` - 获取统计信息

## 缓存策略

### 现有缓存的 TTL 设置

- **Copany**: 5 分钟 - 项目信息变化相对较少
- **Issues**: 2 分钟 - 问题状态变化较频繁
- **README**: 10 分钟 - 文档内容变化最少

### 最佳实践

1. **选择合适的 TTL**: 根据数据变化频率设置
2. **使用有意义的键**: 确保键的唯一性和可读性
3. **添加日志信息**: 便于调试和监控
4. **定期清理**: 在适当时机清理过期缓存

## 迁移指南

如果你正在从旧的缓存实现迁移：

```typescript
// 旧方式
import { copanyCache } from "@/utils/cache/copanyCache";

// 新方式
import { copanyCache } from "@/utils/cache";
```

API 保持完全兼容，无需修改使用代码。
