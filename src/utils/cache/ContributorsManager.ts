import { CopanyContributor } from "@/types/database.types";
import { getCopanyContributorsAction } from "@/actions/copanyContributor.actions";
import { contributorsCache } from "./instances";

/**
 * 贡献者管理器
 * 提供缓存和统一的贡献者获取接口
 */
export class ContributorsManager {
  /**
   * 获取指定 copany 的贡献者列表，优先从缓存获取
   */
  async getContributors(copanyId: string): Promise<CopanyContributor[]> {
    try {
      // 首先尝试从缓存获取
      const cachedContributors = contributorsCache.get(copanyId);
      if (cachedContributors) {
        return cachedContributors;
      }

      // 缓存未命中，从 API 获取
      const contributors = await getCopanyContributorsAction(copanyId);

      // 缓存贡献者信息
      contributorsCache.set(copanyId, contributors);

      return contributors;
    } catch (error) {
      console.error("Error fetching contributors:", error);
      return [];
    }
  }

  /**
   * 清除指定 copany 的贡献者缓存
   */
  clearContributors(copanyId: string): void {
    contributorsCache.clear(copanyId);
  }

  /**
   * 清除所有贡献者缓存
   */
  clearAllContributors(): void {
    contributorsCache.clear();
  }

  /**
   * 手动设置贡献者缓存
   */
  setContributors(copanyId: string, contributors: CopanyContributor[]): void {
    contributorsCache.set(copanyId, contributors);
  }

  /**
   * 获取缓存的贡献者（不会触发网络请求）
   */
  getCachedContributors(copanyId: string): CopanyContributor[] | null {
    return contributorsCache.get(copanyId) || null;
  }

  /**
   * 检查指定 copany 的贡献者是否已缓存
   */
  hasContributors(copanyId: string): boolean {
    return contributorsCache.has(copanyId);
  }
}

// 导出单例实例
export const contributorsManager = new ContributorsManager();
