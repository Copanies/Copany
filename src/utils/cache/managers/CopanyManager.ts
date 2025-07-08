import { Copany } from "@/types/database.types";
import { copanyCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

/**
 * 内部 Copany 数据管理器实现
 */
class CopanyDataManager extends GenericDataManager<Copany> {
  constructor() {
    super({
      cacheManager: copanyCache,
      managerName: "CopanyManager",
      enableStaleCache: false, // Copany 数据相对稳定，不需要过期缓存降级
    });
  }

  protected getDataInfo(data: Copany): string {
    return `项目 ${data.name} (${data.github_url})`;
  }
}

// 创建单例实例
const copanyDataManager = new CopanyDataManager();

/**
 * Copany 数据管理器
 * 提供统一的 Copany 数据缓存管理
 */
export class CopanyManager {
  /**
   * 获取指定 Copany 数据，优先从缓存获取
   */
  async getCopany(
    copanyId: string,
    fetchFn: () => Promise<Copany>
  ): Promise<Copany> {
    return copanyDataManager.getData(copanyId, fetchFn);
  }

  /**
   * 强制刷新 Copany 数据
   */
  async refreshCopany(
    copanyId: string,
    fetchFn: () => Promise<Copany>
  ): Promise<Copany> {
    return copanyDataManager.getData(copanyId, fetchFn, true);
  }

  /**
   * 清除指定 Copany 的缓存
   */
  clearCopany(copanyId: string): void {
    copanyDataManager.clearCache(copanyId);
  }

  /**
   * 清除所有 Copany 缓存
   */
  clearAllCopany(): void {
    copanyDataManager.clearCache();
  }

  /**
   * 手动设置 Copany 缓存
   */
  setCopany(copanyId: string, copany: Copany): void {
    copanyDataManager.setData(copanyId, copany);
  }

  /**
   * 获取缓存的 Copany（不会触发网络请求）
   */
  getCachedCopany(copanyId: string): Copany | null {
    return copanyDataManager.getCachedData(copanyId);
  }

  /**
   * 检查指定 Copany 是否已缓存
   */
  hasCopany(copanyId: string): boolean {
    return copanyDataManager.hasData(copanyId);
  }

  /**
   * 预热缓存
   */
  async preloadCopany(
    copanyId: string,
    fetchFn: () => Promise<Copany>
  ): Promise<void> {
    return copanyDataManager.preloadData(copanyId, fetchFn);
  }
}

// 导出单例实例
export const copanyManager = new CopanyManager();
