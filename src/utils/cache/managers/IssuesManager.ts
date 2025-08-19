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
      const originalIssue = issues[index];
      
      // Only update closed_at when state changes to Done, Canceled, or Duplicate
      let processedIssue = { ...updatedIssue };
      if (updatedIssue.state !== originalIssue.state) {
        processedIssue = {
          ...updatedIssue,
          closed_at:
            updatedIssue.state === IssueState.Done ||
            updatedIssue.state === IssueState.Canceled ||
            updatedIssue.state === IssueState.Duplicate
              ? new Date().toISOString()
              : null,
        };
      }
      
      newIssues[index] = processedIssue;
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
    
    // Only set closed_at if it's not already set and state requires it
    let processedIssue = { ...newIssue };
    if (!newIssue.closed_at && (
      newIssue.state === IssueState.Done ||
      newIssue.state === IssueState.Canceled ||
      newIssue.state === IssueState.Duplicate
    )) {
      processedIssue = {
        ...newIssue,
        closed_at: new Date().toISOString(),
      };
    }
    
    return [processedIssue, ...issues]; // Add to beginning
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
  constructor(
    onDataUpdated?: (key: string, data: IssueWithAssignee[]) => void
  ) {
    super(
      {
        cacheManager: issuesCache,
        managerName: "IssuesManager",
        validator: validateIssues,
        enableStaleCache: true, // Issues data may need fallback processing
        onDataUpdated, // Configure data update callback
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
      IssueState.InReview,
    ];
    const openCount = data.filter(
      (issue) => issue.state !== null && openStates.includes(issue.state)
    ).length;
    return `${data.length} Issues (${openCount} open)`;
  }
}

export class IssuesManager {
  private dataManager: IssuesDataManager;

  constructor(
    onDataUpdated?: (key: string, data: IssueWithAssignee[]) => void
  ) {
    this.dataManager = new IssuesDataManager(onDataUpdated);
  }

  /**
   * Get Issues list for specified Copany, prioritize cache
   */
  async getIssues(
    copanyId: string,
    fetchFn: () => Promise<IssueWithAssignee[]>
  ): Promise<IssueWithAssignee[]> {
    return this.dataManager.getData(copanyId, fetchFn);
  }

  /**
   * Get single Issue (find from cached Issues list)
   * Replaces original UnifiedIssueCache.getIssue functionality
   */
  getIssue(copanyId: string, issueId: string): IssueWithAssignee | null {
    return this.dataManager.findItem(copanyId, issueId);
  }

  /**
   * Update single Issue in cache
   * Replaces original UnifiedIssueCache.setIssue functionality
   */
  setIssue(copanyId: string, issue: IssueWithAssignee): void {
    this.dataManager.updateItem(copanyId, String(issue.id), issue);
  }

  /**
   * Update single Issue in cache (alias method, maintain compatibility)
   */
  updateIssue(copanyId: string, updatedIssue: IssueWithAssignee): void {
    this.dataManager.updateItem(
      copanyId,
      String(updatedIssue.id),
      updatedIssue
    );
  }

  /**
   * Manually set Issues cache
   */
  setIssues(copanyId: string, issues: IssueWithAssignee[]): void {
    this.dataManager.setData(copanyId, issues);
  }
}

// Default instance (no callback, for simple operations)
export const issuesManager = new IssuesManager((key, data) => {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cache:updated", {
          detail: { manager: "IssuesManager", key, data },
        })
      );
    }
  } catch (_) {}
});
