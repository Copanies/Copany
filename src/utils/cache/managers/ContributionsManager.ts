import { Contribution } from "@/types/database.types";
import { contributionsCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

/**
 * 贡献数据验证器
 */
function validateContributions(contributions: Contribution[]): Contribution[] {
  return contributions.filter((contribution) => {
    // 基本验证
    if (!contribution.id || !contribution.user_id || !contribution.copany_id) {
      console.warn(`[ContributionsManager] ⚠️ 无效的贡献记录:`, contribution);
      return false;
    }

    // 时间验证
    if (
      contribution.year < 2020 ||
      contribution.year > new Date().getFullYear() + 1
    ) {
      console.warn(`[ContributionsManager] ⚠️ 年份异常:`, contribution);
      return false;
    }

    if (contribution.month < 1 || contribution.month > 12) {
      console.warn(`[ContributionsManager] ⚠️ 月份异常:`, contribution);
      return false;
    }

    return true;
  });
}

/**
 * 贡献数据缓存管理器
 * 提供高级缓存功能，包括智能刷新和数据验证
 */
class ContributionsDataManager extends GenericDataManager<Contribution[]> {
  constructor() {
    super({
      cacheManager: contributionsCache,
      managerName: "ContributionsManager",
      validator: validateContributions,
      enableStaleCache: true,
    });
  }

  protected getDataInfo(data: Contribution[]): string {
    return `${data.length} 条`;
  }
}

// 创建内部数据管理器实例
const contributionsDataManager = new ContributionsDataManager();

/**
 * 贡献数据管理器
 * 提供统一的贡献数据缓存管理
 */
export class ContributionsManager {
  /**
   * 获取指定 Copany 的贡献数据，优先从缓存获取
   */
  async getContributions(
    copanyId: string,
    fetchFn: () => Promise<Contribution[]>
  ): Promise<Contribution[]> {
    return contributionsDataManager.getData(copanyId, fetchFn);
  }

  /**
   * 强制刷新贡献数据
   */
  async refreshContributions(
    copanyId: string,
    fetchFn: () => Promise<Contribution[]>
  ): Promise<Contribution[]> {
    return contributionsDataManager.getData(copanyId, fetchFn, true);
  }

  /**
   * 清除指定 Copany 的贡献缓存
   */
  clearContributions(copanyId: string): void {
    contributionsDataManager.clearCache(copanyId);
  }

  /**
   * 清除所有贡献缓存
   */
  clearAllContributions(): void {
    contributionsDataManager.clearCache();
  }

  /**
   * 手动设置贡献缓存
   */
  setContributions(copanyId: string, contributions: Contribution[]): void {
    contributionsDataManager.setData(copanyId, contributions);
  }

  /**
   * 获取缓存的贡献数据（不会触发网络请求）
   */
  getCachedContributions(copanyId: string): Contribution[] | null {
    return contributionsDataManager.getCachedData(copanyId);
  }

  /**
   * 检查指定 Copany 的贡献是否已缓存
   */
  hasContributions(copanyId: string): boolean {
    return contributionsDataManager.hasData(copanyId);
  }

  /**
   * 预热缓存
   */
  async preloadContributions(
    copanyId: string,
    fetchFn: () => Promise<Contribution[]>
  ): Promise<void> {
    return contributionsDataManager.preloadData(copanyId, fetchFn);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { count: number; totalSize: number } {
    return contributionsDataManager.getCacheStats();
  }
}

// 导出单例实例
export const contributionsManager = new ContributionsManager();
