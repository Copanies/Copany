// 缓存系统统一导出
export { CacheManager } from "./CacheManager";
export {
  copanyCache,
  issuesCache,
  readmeCache,
  currentUserCache,
  contributorsCache,
} from "./instances";
export { unifiedIssueCache } from "./UnifiedIssueCache";
export { currentUserManager } from "./CurrentUserManager";
export { contributorsManager } from "./ContributorsManager";
export type {
  CacheConfig,
  KeyGenerator,
  LogInfoGenerator,
} from "./CacheManager";
