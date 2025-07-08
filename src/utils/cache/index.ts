// 缓存系统统一导出
export { CacheManager } from "./CacheManager";
export { GenericDataManager } from "./GenericDataManager";
export type { DataManagerConfig } from "./GenericDataManager";

export {
  copanyCache,
  issuesCache,
  readmeCache,
  currentUserCache,
  contributorsCache,
  contributionsCache,
} from "./instances";

// 导出所有业务层管理器（推荐使用）
export {
  ContributionsManager,
  contributionsManager,
} from "./managers/ContributionsManager";
export {
  ContributorsManager,
  contributorsManager,
} from "./managers/ContributorsManager";
export {
  CurrentUserManager,
  currentUserManager,
} from "./managers/CurrentUserManager";
export { CopanyManager, copanyManager } from "./managers/CopanyManager";
export { IssuesManager, issuesManager } from "./managers/IssuesManager";
export { ReadmeManager, readmeManager } from "./managers/ReadmeManager";
