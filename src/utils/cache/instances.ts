import { CacheManager } from "./CacheManager";
import {
  Copany,
  IssueWithAssignee,
  CopanyContributor,
} from "@/types/database.types";
import { User } from "@supabase/supabase-js";

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
export const issuesCache = new CacheManager<IssueWithAssignee[], string>(
  {
    keyPrefix: "issues_cache_",
    ttl: 24 * 60 * 60 * 1000, // 1天
    loggerName: "IssuesCache",
  },
  undefined, // 使用默认的键生成器
  (data: IssueWithAssignee[]) => ({ issueCount: data.length }) // 日志信息生成器
);

// 当前用户缓存实例
export const currentUserCache = new CacheManager<User, string>(
  {
    keyPrefix: "current_user_cache_",
    ttl: 24 * 60 * 60 * 1000, // 1天
    loggerName: "CurrentUserCache",
  },
  () => "current_user", // 固定键，因为只有一个当前用户
  (data: User) => ({ userId: data.id, userEmail: data.email }) // 日志信息生成器
);

// Copany 贡献者缓存实例
export const contributorsCache = new CacheManager<CopanyContributor[], string>(
  {
    keyPrefix: "contributors_cache_",
    ttl: 24 * 60 * 60 * 1000, // 1天
    loggerName: "ContributorsCache",
  },
  undefined, // 使用默认的键生成器（copanyId）
  (data: CopanyContributor[]) => ({ contributorCount: data.length }) // 日志信息生成器
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
