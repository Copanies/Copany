import { Issue } from "@/types/database.types";
import { issuesCache } from "./instances";

/**
 * 统一的 Issue 缓存管理器
 * 单个 issue 的缓存从 issues 列表缓存中派生，确保数据一致性
 */
export class UnifiedIssueCache {
  /**
   * 根据 copanyId 和 issueId 获取单个 issue
   */
  getIssue(copanyId: string, issueId: string): Issue | null {
    const issues = issuesCache.get(copanyId);
    if (!issues) {
      console.log(
        `[UnifiedIssueCache] 🚫 No issues cache for copany: ${copanyId}`
      );
      return null;
    }

    const issue = issues.find((issue) => String(issue.id) === String(issueId));
    if (issue) {
      console.log(
        `[UnifiedIssueCache] ✅ Found issue in cache: ${issue.title}`
      );
    } else {
      console.log(
        `[UnifiedIssueCache] ❌ Issue not found in cache: ${issueId}`
      );
    }

    return issue || null;
  }

  /**
   * 更新单个 issue，同时更新 issues 列表缓存
   */
  setIssue(copanyId: string, updatedIssue: Issue): void {
    const issues = issuesCache.get(copanyId) || [];

    // 查找并更新对应的 issue
    const issueIndex = issues.findIndex(
      (issue) => String(issue.id) === String(updatedIssue.id)
    );

    if (issueIndex >= 0) {
      // 更新现有 issue
      issues[issueIndex] = updatedIssue;
      console.log(
        `[UnifiedIssueCache] 🔄 Updated existing issue: ${updatedIssue.title}`
      );
    } else {
      // 添加新 issue
      issues.push(updatedIssue);
      console.log(
        `[UnifiedIssueCache] ➕ Added new issue: ${updatedIssue.title}`
      );
    }

    // 更新 issues 列表缓存
    issuesCache.set(copanyId, issues);
  }

  /**
   * 删除单个 issue
   */
  removeIssue(copanyId: string, issueId: string): void {
    const issues = issuesCache.get(copanyId);
    if (!issues) {
      console.log(
        `[UnifiedIssueCache] 🚫 No issues cache for copany: ${copanyId}`
      );
      return;
    }

    const filteredIssues = issues.filter(
      (issue) => String(issue.id) !== String(issueId)
    );
    issuesCache.set(copanyId, filteredIssues);
    console.log(`[UnifiedIssueCache] 🗑️ Removed issue: ${issueId}`);
  }

  /**
   * 检查 issue 是否存在于缓存中
   */
  hasIssue(copanyId: string, issueId: string): boolean {
    return this.getIssue(copanyId, issueId) !== null;
  }

  /**
   * 智能缓存策略：只有当新数据更新时才更新缓存
   */
  smartSetIssue(copanyId: string, issue: Issue): void {
    const cachedIssue = this.getIssue(copanyId, issue.id);

    if (!cachedIssue) {
      // 缓存中没有数据，直接缓存
      this.setIssue(copanyId, issue);
      return;
    }

    // 比较更新时间
    const newUpdatedAt = new Date(issue.updated_at || 0).getTime();
    const cachedUpdatedAt = new Date(cachedIssue.updated_at || 0).getTime();

    if (newUpdatedAt > cachedUpdatedAt) {
      // 新数据更新，更新缓存
      this.setIssue(copanyId, issue);
      console.log(`[UnifiedIssueCache] 🔄 Smart update: new data is newer`);
    } else {
      console.log(
        `[UnifiedIssueCache] ⏭️ Smart update: cached data is newer, skipping`
      );
    }
  }
}

// 导出单例实例
export const unifiedIssueCache = new UnifiedIssueCache();
