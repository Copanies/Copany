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

// 导出所有数据管理器（推荐使用）
export { contributionsDataManager } from "./managers/ContributionsManager";
export {
  ContributorsManager,
  contributorsManager,
  contributorsDataManager,
} from "./managers/ContributorsManager";
export {
  CurrentUserManager,
  currentUserManager,
  currentUserDataManager,
} from "./managers/CurrentUserManager";
export {
  CopanyManager,
  copanyManager,
  copanyDataManager,
} from "./managers/CopanyManager";
export {
  IssuesManager,
  issuesManager,
  issuesDataManager,
} from "./managers/IssuesManager";
export {
  ReadmeManager,
  readmeManager,
  readmeDataManager,
} from "./managers/ReadmeManager";
