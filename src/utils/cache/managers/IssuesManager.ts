import { IssueWithAssignee, IssueState } from "@/types/database.types";
import { issuesCache } from "../instances";
import { GenericDataManager, DataItemOperations } from "../GenericDataManager";

/**
 * Issues 数据验证器
 */
function validateIssues(issues: IssueWithAssignee[]): IssueWithAssignee[] {
  return issues.filter((issue) => {
    // 基本验证
    if (!issue.id || !issue.title || !issue.copany_id) {
      console.warn(`[IssuesManager] ⚠️ 无效的 issue 记录:`, issue);
      return false;
    }
    return true;
  });
}

/**
 * Issues 单个数据项操作定义
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
    // 检查是否已存在，避免重复
    const exists = issues.some((issue) => issue.id === newIssue.id);
    if (exists) {
      return issues;
    }
    return [newIssue, ...issues]; // 添加到开头
  },

  removeItem: (issues: IssueWithAssignee[], issueId: string) => {
    return issues.filter((issue) => String(issue.id) !== String(issueId));
  },
};

/**
 * 内部 Issues 数据管理器实现
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
        enableStaleCache: true, // Issues 数据可能需要降级处理
      },
      issueItemOperations
    );
  }

  protected getDataInfo(data: IssueWithAssignee[]): string {
    // 计算开放状态的 Issues (除了 Done, Canceled, Duplicate 之外的状态)
    const openStates = [
      IssueState.Backlog,
      IssueState.Todo,
      IssueState.InProgress,
    ];
    const openCount = data.filter(
      (issue) => issue.state !== null && openStates.includes(issue.state)
    ).length;
    return `${data.length} 个 Issues (${openCount} 开放)`;
  }
}

// 创建单例实例
const issuesDataManager = new IssuesDataManager();

/**
 * Issues 数据管理器
 * 提供统一的 Issues 数据缓存管理，整合了原有的 UnifiedIssueCache 功能
 * 现在支持单个Issue的CRUD操作和智能缓存策略
 */
export class IssuesManager {
  /**
   * 获取指定 Copany 的 Issues 列表，优先从缓存获取
   */
  async getIssues(
    copanyId: string,
    fetchFn: () => Promise<IssueWithAssignee[]>
  ): Promise<IssueWithAssignee[]> {
    return issuesDataManager.getData(copanyId, fetchFn);
  }

  /**
   * 强制刷新 Issues 数据
   */
  async refreshIssues(
    copanyId: string,
    fetchFn: () => Promise<IssueWithAssignee[]>
  ): Promise<IssueWithAssignee[]> {
    return issuesDataManager.getData(copanyId, fetchFn, true);
  }

  /**
   * 获取单个 Issue（从缓存的 Issues 列表中查找）
   * 替代原 UnifiedIssueCache.getIssue 功能
   */
  getIssue(copanyId: string, issueId: string): IssueWithAssignee | null {
    return issuesDataManager.findItem(copanyId, issueId);
  }

  /**
   * 更新缓存中的单个 Issue
   * 替代原 UnifiedIssueCache.setIssue 功能
   */
  setIssue(copanyId: string, issue: IssueWithAssignee): void {
    issuesDataManager.updateItem(copanyId, String(issue.id), issue);
  }

  /**
   * 智能设置单个 Issue（比较时间戳，只保留最新数据）
   * 替代原 UnifiedIssueCache.smartSetIssue 功能
   */
  smartSetIssue(copanyId: string, issue: IssueWithAssignee): void {
    issuesDataManager.smartSetItem(copanyId, issue);
  }

  /**
   * 更新缓存中的单个 Issue（别名方法，保持兼容性）
   */
  updateIssue(copanyId: string, updatedIssue: IssueWithAssignee): void {
    issuesDataManager.updateItem(
      copanyId,
      String(updatedIssue.id),
      updatedIssue
    );
  }

  /**
   * 添加新 Issue 到缓存
   */
  addIssue(copanyId: string, newIssue: IssueWithAssignee): void {
    issuesDataManager.addItem(copanyId, newIssue);
  }

  /**
   * 从缓存中删除 Issue
   * 替代原 UnifiedIssueCache.removeIssue 功能
   */
  removeIssue(copanyId: string, issueId: string): void {
    issuesDataManager.removeItem(copanyId, issueId);
  }

  /**
   * 清除指定 Copany 的 Issues 缓存
   */
  clearIssues(copanyId: string): void {
    issuesDataManager.clearCache(copanyId);
  }

  /**
   * 清除所有 Issues 缓存
   */
  clearAllIssues(): void {
    issuesDataManager.clearCache();
  }

  /**
   * 手动设置 Issues 缓存
   */
  setIssues(copanyId: string, issues: IssueWithAssignee[]): void {
    issuesDataManager.setData(copanyId, issues);
  }

  /**
   * 获取缓存的 Issues（不会触发网络请求）
   */
  getCachedIssues(copanyId: string): IssueWithAssignee[] | null {
    return issuesDataManager.getCachedData(copanyId);
  }

  /**
   * 检查指定 Copany 的 Issues 是否已缓存
   */
  hasIssues(copanyId: string): boolean {
    return issuesDataManager.hasData(copanyId);
  }

  /**
   * 预热缓存
   */
  async preloadIssues(
    copanyId: string,
    fetchFn: () => Promise<IssueWithAssignee[]>
  ): Promise<void> {
    return issuesDataManager.preloadData(copanyId, fetchFn);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { count: number; totalSize: number } {
    return issuesDataManager.getCacheStats();
  }

  // ===== 兼容 UnifiedIssueCache 的方法 =====

  /**
   * 检查单个 Issue 是否存在于缓存中
   * 兼容原 UnifiedIssueCache.hasIssue 功能
   */
  hasIssue(copanyId: string, issueId: string): boolean {
    return this.getIssue(copanyId, issueId) !== null;
  }

  /**
   * 批量设置 Issues（用于初始加载或刷新）
   * 兼容原 UnifiedIssueCache 的批量操作
   */
  batchSetIssues(copanyId: string, issues: IssueWithAssignee[]): void {
    this.setIssues(copanyId, issues);
    console.log(
      `[IssuesManager] 📦 Batch cached ${issues.length} issues for copany: ${copanyId}`
    );
  }

  /**
   * 获取Issue列表中特定状态的Issues数量
   */
  getIssueCountByState(copanyId: string, state: IssueState): number {
    const issues = this.getCachedIssues(copanyId);
    if (!issues) return 0;
    return issues.filter((issue) => issue.state === state).length;
  }

  /**
   * 获取Issue列表中特定用户的Issues
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

// 导出单例实例
export const issuesManager = new IssuesManager();

// 导出推荐使用的数据管理器实例
export { issuesDataManager };
