// Unified cache system exports
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

// Export all business layer managers (recommended to use)
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
