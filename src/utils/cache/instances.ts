import { CacheManager } from "./CacheManager";
import {
  Copany,
  IssueWithAssignee,
  CopanyContributor,
  Contribution,
} from "@/types/database.types";
import { User } from "@supabase/supabase-js";

// Copany 缓存实例
export const copanyCache = new CacheManager<Copany, string>(
  {
    keyPrefix: "copany_cache_",
    ttl: 24 * 60 * 60 * 1000, // 1天
    loggerName: "CopanyCache",
    backgroundRefreshInterval: 30 * 60 * 1000, // 30分钟 - 项目信息变化较少
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
    backgroundRefreshInterval: 5 * 60 * 1000, // 5分钟 - Issues 变化较频繁
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
    backgroundRefreshInterval: 15 * 60 * 1000, // 15分钟 - 用户信息适中刷新频率
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
    backgroundRefreshInterval: 5 * 60 * 1000, // 5分钟 - 贡献者相对稳定
  },
  undefined, // 使用默认的键生成器（copanyId）
  (data: CopanyContributor[]) => ({ contributorCount: data.length }) // 日志信息生成器
);

// Contribution 缓存实例
export const contributionsCache = new CacheManager<Contribution[], string>(
  {
    keyPrefix: "contributions_cache_",
    ttl: 12 * 60 * 60 * 1000, // 12小时 - 贡献数据变化相对频繁
    loggerName: "ContributionsCache",
    backgroundRefreshInterval: 10 * 60 * 1000, // 10分钟 - 贡献数据需要较频繁更新
  },
  undefined, // 使用默认的键生成器（copanyId）
  (data: Contribution[]) => ({ contributionCount: data.length }) // 日志信息生成器
);

// 注意：单个 Issue 缓存现在通过 IssuesManager 管理，从 issues 列表缓存中派生

// README 缓存实例
export const readmeCache = new CacheManager<string, string>(
  {
    keyPrefix: "readme_cache_",
    ttl: 24 * 60 * 60 * 1000, // 1天
    loggerName: "ReadmeCache",
    backgroundRefreshInterval: 60 * 60 * 1000, // 60分钟 - README 变化最少
  },
  // 自定义键生成器：处理 GitHub URL
  (githubUrl: string) =>
    githubUrl.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "_"),
  (content: string) => ({ contentLength: content.length }) // 日志信息生成器
);
