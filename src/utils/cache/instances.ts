import { CacheManager } from "./CacheManager";
import {
  Copany,
  IssueWithAssignee,
  CopanyContributor,
  Contribution,
} from "@/types/database.types";
import { User } from "@supabase/supabase-js";

// Copany cache instance
export const copanyCache = new CacheManager<Copany, string>(
  {
    keyPrefix: "copany_cache_",
    ttl: 24 * 60 * 60 * 1000, // 1 day
    loggerName: "CopanyCache",
    backgroundRefreshInterval: 30 * 60 * 1000, // 30 minutes - project info changes less frequently
  },
  undefined, // Use default key generator
  (data: Copany) => ({ copanyName: data.name }) // Log info generator
);

// Issues cache instance
export const issuesCache = new CacheManager<IssueWithAssignee[], string>(
  {
    keyPrefix: "issues_cache_",
    ttl: 24 * 60 * 60 * 1000, // 1 day
    loggerName: "IssuesCache",
    backgroundRefreshInterval: 5 * 60 * 1000, // 5 minutes - Issues change more frequently
  },
  undefined, // Use default key generator
  (data: IssueWithAssignee[]) => ({ issueCount: data.length }) // Log info generator
);

// Current user cache instance
export const currentUserCache = new CacheManager<User, string>(
  {
    keyPrefix: "current_user_cache_",
    ttl: 24 * 60 * 60 * 1000, // 1 day
    loggerName: "CurrentUserCache",
    backgroundRefreshInterval: 15 * 60 * 1000, // 15 minutes - moderate refresh rate for user info
  },
  () => "current_user", // Fixed key because there's only one current user
  (data: User) => ({ userId: data.id, userEmail: data.email }) // Log info generator
);

// Copany contributors cache instance
export const contributorsCache = new CacheManager<CopanyContributor[], string>(
  {
    keyPrefix: "contributors_cache_",
    ttl: 24 * 60 * 60 * 1000, // 1 day
    loggerName: "ContributorsCache",
    backgroundRefreshInterval: 5 * 60 * 1000, // 5 minutes - contributors are relatively stable
  },
  undefined, // Use default key generator (copanyId)
  (data: CopanyContributor[]) => ({ contributorCount: data.length }) // Log info generator
);

// Contribution cache instance
export const contributionsCache = new CacheManager<Contribution[], string>(
  {
    keyPrefix: "contributions_cache_",
    ttl: 12 * 60 * 60 * 1000, // 12 hours - contribution data changes relatively frequently
    loggerName: "ContributionsCache",
    backgroundRefreshInterval: 10 * 60 * 1000, // 10 minutes - contribution data needs more frequent updates
  },
  undefined, // Use default key generator (copanyId)
  (data: Contribution[]) => ({ contributionCount: data.length }) // Log info generator
);

// Note: Single Issue cache is now managed through IssuesManager, derived from the issues list cache

// README cache instance
export const readmeCache = new CacheManager<string, string>(
  {
    keyPrefix: "readme_cache_",
    ttl: 24 * 60 * 60 * 1000, // 1 day
    loggerName: "ReadmeCache",
    backgroundRefreshInterval: 60 * 60 * 1000, // 60 minutes - READMEs change least frequently
  },
  // Custom key generator: handle GitHub URL
  (githubUrl: string) =>
    githubUrl.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "_"),
  (content: string) => ({ contentLength: content.length }) // Log info generator
);
