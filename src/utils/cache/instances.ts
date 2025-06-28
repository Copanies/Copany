import { CacheManager } from "./CacheManager";
import { Copany, Issue } from "@/types/database.types";

// Copany 缓存实例
export const copanyCache = new CacheManager<Copany, string>(
  {
    keyPrefix: "copany_cache_",
    ttl: 24 * 60 * 60 * 1000, // 1天
    loggerName: "CopanyCache",
  },
  undefined, // 使用默认的键生成器
  (data: Copany) => ({ copanyName: data.name }) // 日志信息生成器
);

// Issues 缓存实例
export const issuesCache = new CacheManager<Issue[], string>(
  {
    keyPrefix: "issues_cache_",
    ttl: 30 * 60 * 1000, // 30分钟
    loggerName: "IssuesCache",
  },
  undefined, // 使用默认的键生成器
  (data: Issue[]) => ({ issueCount: data.length }) // 日志信息生成器
);

// 注意：单个 Issue 缓存现在通过 UnifiedIssueCache 管理，从 issues 列表缓存中派生

// README 缓存实例
export const readmeCache = new CacheManager<string, string>(
  {
    keyPrefix: "readme_cache_",
    ttl: 24 * 60 * 60 * 1000, // 1天
    loggerName: "ReadmeCache",
  },
  // 自定义键生成器：处理 GitHub URL
  (githubUrl: string) =>
    githubUrl.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "_"),
  (content: string) => ({ contentLength: content.length }) // 日志信息生成器
);
