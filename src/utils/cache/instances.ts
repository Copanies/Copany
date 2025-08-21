import { CacheManager } from "./CacheManager";

// Issues UI state cache (per copanyId)
export const issuesUiStateCache = new CacheManager<Record<number, boolean>, string>(
  {
    keyPrefix: "issues_ui_state_",
    ttl: 365 * 24 * 60 * 60 * 1000, // 1 year
    loggerName: "IssuesUiStateCache",
    backgroundRefreshInterval: 24 * 60 * 60 * 1000, // daily
  },
  undefined,
  (data: Record<number, boolean>) => ({ keys: Object.keys(data).length })
);
