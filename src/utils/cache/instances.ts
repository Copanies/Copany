import { CacheManager } from "./CacheManager";
import {
  Copany,
  IssueWithAssignee,
  CopanyContributor,
  Contribution,
  IssueComment,
} from "@/types/database.types";
import { User } from "@supabase/supabase-js";
import { UserInfo } from "@/actions/user.actions";

// Copany cache instance
export const copanyCache = new CacheManager<Copany, string>(
  {
    keyPrefix: "copany_cache_",
    ttl: 30 * 24 * 60 * 60 * 1000, // 1 month
    loggerName: "CopanyCache",
    backgroundRefreshInterval: 1 * 60 * 1000, // 1 minute
  },
  undefined, // Use default key generator
  (data: Copany) => ({ copanyName: data.name }) // Log info generator
);

// Issues cache instance
export const issuesCache = new CacheManager<IssueWithAssignee[], string>(
  {
    keyPrefix: "issues_cache_",
    ttl: 30 * 24 * 60 * 60 * 1000, // 1 month
    loggerName: "IssuesCache",
    backgroundRefreshInterval: 1 * 60 * 1000, // 1 minute
  },
  undefined, // Use default key generator
  (data: IssueWithAssignee[]) => ({ issueCount: data.length }) // Log info generator
);

// Current user cache instance
export const currentUserCache = new CacheManager<User, string>(
  {
    keyPrefix: "current_user_cache_",
    ttl: 30 * 24 * 60 * 60 * 1000, // 1 month
    loggerName: "CurrentUserCache",
    backgroundRefreshInterval: 60 * 60 * 1000, // 1 hour - moderate refresh rate for user info
  },
  () => "current_user", // Fixed key because there's only one current user
  (data: User) => ({ userId: data.id, userEmail: data.email }) // Log info generator
);

// Copany contributors cache instance
export const contributorsCache = new CacheManager<CopanyContributor[], string>(
  {
    keyPrefix: "contributors_cache_",
    ttl: 30 * 24 * 60 * 60 * 1000, // 1 month
    loggerName: "ContributorsCache",
    backgroundRefreshInterval: 1 * 60 * 1000, // 1 minute
  },
  undefined, // Use default key generator (copanyId)
  (data: CopanyContributor[]) => ({ contributorCount: data.length }) // Log info generator
);

// Contribution cache instance
export const contributionsCache = new CacheManager<Contribution[], string>(
  {
    keyPrefix: "contributions_cache_",
    ttl: 30 * 24 * 60 * 60 * 1000, // 1 month
    loggerName: "ContributionsCache",
    backgroundRefreshInterval: 1 * 60 * 1000, // 1 minute
  },
  undefined, // Use default key generator (copanyId)
  (data: Contribution[]) => ({ contributionCount: data.length }) // Log info generator
);

// Note: Single Issue cache is now managed through IssuesManager, derived from the issues list cache

// README cache instance
export const readmeCache = new CacheManager<string, string>(
  {
    keyPrefix: "readme_cache_",
    ttl: 30 * 24 * 60 * 60 * 1000, // 1 month
    loggerName: "ReadmeCache",
    backgroundRefreshInterval: 1 * 60 * 1000, // 1 minute
  },
  // Custom key generator: handle GitHub URL
  (githubUrl: string) =>
    githubUrl.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "_"),
  (content: string) => ({ contentLength: content.length }) // Log info generator
);

// License cache instance
export const licenseCache = new CacheManager<string, string>(
  {
    keyPrefix: "license_cache_",
    ttl: 30 * 24 * 60 * 60 * 1000, // 1 month
    loggerName: "LicenseCache",
    backgroundRefreshInterval: 1 * 60 * 1000, // 1 minute
  },
  // Custom key generator: handle GitHub URL
  (githubUrl: string) =>
    githubUrl.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "_"),
  (content: string) => ({ contentLength: content.length }) // Log info generator
);

// User info cache instance
export const userInfoCache = new CacheManager<UserInfo, string>(
  {
    keyPrefix: "user_info_cache_",
    ttl: 30 * 24 * 60 * 60 * 1000, // 1 month
    loggerName: "UserInfoCache",
    backgroundRefreshInterval: 60 * 60 * 1000, // 1 hour - moderate refresh rate for user info
  },
  undefined, // Use default key generator (userId)
  (data: UserInfo) => ({ userId: data.id, userName: data.name }) // Log info generator
);

// Issue comments cache instance
export const issueCommentsCache = new CacheManager<IssueComment[], string>(
  {
    keyPrefix: "issue_comments_cache_",
    ttl: 30 * 24 * 60 * 60 * 1000, // 1 month
    loggerName: "IssueCommentsCache",
    backgroundRefreshInterval: 1 * 60 * 1000, // 1 minute
  },
  undefined, // Use default key generator (issueId)
  (data: IssueComment[]) => ({ commentCount: data.length }) // Log info generator
);
