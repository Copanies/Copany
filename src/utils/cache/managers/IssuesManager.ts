import { IssueWithAssignee, IssueState } from "@/types/database.types";
import { issuesCache } from "../instances";
import { GenericDataManager, DataItemOperations } from "../GenericDataManager";

/**
 * Issues data validator
 */
function validateIssues(issues: IssueWithAssignee[]): IssueWithAssignee[] {
  return issues.filter((issue) => {
    // Basic validation
    if (!issue.id || !issue.title || !issue.copany_id) {
      console.warn(`[IssuesManager] ⚠️ Invalid issue record:`, issue);
      return false;
    }
    return true;
  });
}

/**
 * Issues single data item operations definition
 */
const issueItemOperations: DataItemOperations<
  IssueWithAssignee[],
  IssueWithAssignee
> = {
  findItem: (issues: IssueWithAssignee[], issueId: string) => {
    return issues.find((issue) => String(issue.id) === String(issueId)) || null;
  },

  updateItem: (
    issues: IssueWithAssignee[],
    issueId: string,
    updatedIssue: IssueWithAssignee
  ) => {
    const index = issues.findIndex((issue) => issue.id === updatedIssue.id);
    if (index !== -1) {
      const newIssues = [...issues];
      newIssues[index] = updatedIssue;
      return newIssues;
    }
    return issues;
  },

  addItem: (issues: IssueWithAssignee[], newIssue: IssueWithAssignee) => {
    // Check if already exists, avoid duplicates
    const exists = issues.some((issue) => issue.id === newIssue.id);
    if (exists) {
      return issues;
    }
    return [newIssue, ...issues]; // Add to beginning
  },

  removeItem: (issues: IssueWithAssignee[], issueId: string) => {
    return issues.filter((issue) => String(issue.id) !== String(issueId));
  },
};

/**
 * Internal Issues data manager implementation
 */
class IssuesDataManager extends GenericDataManager<
  IssueWithAssignee[],
  IssueWithAssignee
> {
  constructor() {
    super(
      {
        cacheManager: issuesCache,
        managerName: "IssuesManager",
        validator: validateIssues,
        enableStaleCache: true, // Issues data may need fallback processing
      },
      issueItemOperations
    );
  }

  protected getDataInfo(data: IssueWithAssignee[]): string {
    // Calculate open state Issues (states other than Done, Canceled, Duplicate)
    const openStates = [
      IssueState.Backlog,
      IssueState.Todo,
      IssueState.InProgress,
    ];
    const openCount = data.filter(
      (issue) => issue.state !== null && openStates.includes(issue.state)
    ).length;
    return `${data.length} Issues (${openCount} open)`;
  }
}

// Create singleton instance
const issuesDataManager = new IssuesDataManager();

/**
 * Issues data manager
 * Provides unified Issues data cache management, integrating original UnifiedIssueCache functionality
 * Now supports individual Issue CRUD operations and intelligent caching strategies
 */
export class IssuesManager {
  /**
   * Get Issues list for specified Copany, prioritize cache
   */
  async getIssues(
    copanyId: string,
    fetchFn: () => Promise<IssueWithAssignee[]>
  ): Promise<IssueWithAssignee[]> {
    return issuesDataManager.getData(copanyId, fetchFn);
  }

  /**
   * Force refresh Issues data
   */
  async refreshIssues(
    copanyId: string,
    fetchFn: () => Promise<IssueWithAssignee[]>
  ): Promise<IssueWithAssignee[]> {
    return issuesDataManager.getData(copanyId, fetchFn, true);
  }

  /**
   * Get single Issue (find from cached Issues list)
   * Replaces original UnifiedIssueCache.getIssue functionality
   */
  getIssue(copanyId: string, issueId: string): IssueWithAssignee | null {
    return issuesDataManager.findItem(copanyId, issueId);
  }

  /**
   * Update single Issue in cache
   * Replaces original UnifiedIssueCache.setIssue functionality
   */
  setIssue(copanyId: string, issue: IssueWithAssignee): void {
    issuesDataManager.updateItem(copanyId, String(issue.id), issue);
  }

  /**
   * Update single Issue in cache (alias method, maintain compatibility)
   */
  updateIssue(copanyId: string, updatedIssue: IssueWithAssignee): void {
    issuesDataManager.updateItem(
      copanyId,
      String(updatedIssue.id),
      updatedIssue
    );
  }

  /**
   * Add new Issue to cache
   */
  addIssue(copanyId: string, newIssue: IssueWithAssignee): void {
    issuesDataManager.addItem(copanyId, newIssue);
  }

  /**
   * Remove Issue from cache
   * Replaces original UnifiedIssueCache.removeIssue functionality
   */
  removeIssue(copanyId: string, issueId: string): void {
    issuesDataManager.removeItem(copanyId, issueId);
  }

  /**
   * Clear Issues cache for specified Copany
   */
  clearIssues(copanyId: string): void {
    issuesDataManager.clearCache(copanyId);
  }

  /**
   * Clear all Issues cache
   */
  clearAllIssues(): void {
    issuesDataManager.clearCache();
  }

  /**
   * Manually set Issues cache
   */
  setIssues(copanyId: string, issues: IssueWithAssignee[]): void {
    issuesDataManager.setData(copanyId, issues);
  }

  /**
   * Get cached Issues (won't trigger network request)
   */
  getCachedIssues(copanyId: string): IssueWithAssignee[] | null {
    return issuesDataManager.getCachedData(copanyId);
  }

  /**
   * Check if Issues for specified Copany are cached
   */
  hasIssues(copanyId: string): boolean {
    return issuesDataManager.hasData(copanyId);
  }

  /**
   * Preload cache
   */
  async preloadIssues(
    copanyId: string,
    fetchFn: () => Promise<IssueWithAssignee[]>
  ): Promise<void> {
    return issuesDataManager.preloadData(copanyId, fetchFn);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { count: number; totalSize: number } {
    return issuesDataManager.getCacheStats();
  }

  /**
   * Check if specific Issue is cached
   */
  hasIssue(copanyId: string, issueId: string): boolean {
    return issuesDataManager.hasItem(copanyId, issueId);
  }

  /**
   * Batch set Issues to cache
   */
  batchSetIssues(copanyId: string, issues: IssueWithAssignee[]): void {
    issuesDataManager.batchSetData(copanyId, issues);
  }

  /**
   * Get Issue count by state
   */
  getIssueCountByState(copanyId: string, state: IssueState): number {
    const issues = this.getCachedIssues(copanyId);
    if (!issues) return 0;
    return issues.filter((issue) => issue.state === state).length;
  }

  /**
   * Get Issues by assignee
   */
  getIssuesByAssignee(
    copanyId: string,
    assigneeId: string
  ): IssueWithAssignee[] {
    const issues = this.getCachedIssues(copanyId);
    if (!issues) return [];
    return issues.filter((issue) => issue.assignee === assigneeId);
  }
}

// Export singleton instance
export const issuesManager = new IssuesManager();
