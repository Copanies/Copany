// Unified cache system exports
export { CacheManager } from "./CacheManager";
export { GenericDataManager } from "./GenericDataManager";
export type { DataManagerConfig } from "./GenericDataManager";

// Export all business layer managers (recommended to use)
export {
  IssuesUiStateManager,
  issuesUiStateManager,
} from "./managers/IssuesUiStateManager";