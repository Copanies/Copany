import { CopanyContributor } from "@/types/database.types";
import { getCopanyContributorsAction } from "@/actions/copanyContributor.actions";
import { contributorsCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

/**
 * 内部贡献者数据管理器实现
 */
class ContributorsDataManager extends GenericDataManager<CopanyContributor[]> {
  constructor() {
    super({
      cacheManager: contributorsCache,
      managerName: "ContributorsManager",
      enableStaleCache: false, // 贡献者数据相对稳定，不需要过期缓存降级
    });
  }

  protected getDataInfo(data: CopanyContributor[]): string {
    return `${data.length} 名贡献者`;
  }
}

// 创建单例实例
const contributorsDataManager = new ContributorsDataManager();

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
      return await contributorsDataManager.getData(copanyId, () =>
        getCopanyContributorsAction(copanyId)
      );
    } catch (error) {
      console.error("Error fetching contributors:", error);
      return [];
    }
  }

  /**
   * 清除指定 copany 的贡献者缓存
   */
  clearContributors(copanyId: string): void {
    contributorsDataManager.clearCache(copanyId);
  }

  /**
   * 清除所有贡献者缓存
   */
  clearAllContributors(): void {
    contributorsDataManager.clearCache();
  }

  /**
   * 手动设置贡献者缓存
   */
  setContributors(copanyId: string, contributors: CopanyContributor[]): void {
    contributorsDataManager.setData(copanyId, contributors);
  }

  /**
   * 获取缓存的贡献者（不会触发网络请求）
   */
  getCachedContributors(copanyId: string): CopanyContributor[] | null {
    return contributorsDataManager.getCachedData(copanyId);
  }

  /**
   * 检查指定 copany 的贡献者是否已缓存
   */
  hasContributors(copanyId: string): boolean {
    return contributorsDataManager.hasData(copanyId);
  }
}

// 导出单例实例
export const contributorsManager = new ContributorsManager();

// 导出推荐使用的数据管理器实例
export { contributorsDataManager };
