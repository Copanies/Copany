import { readmeCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

/**
 * README 数据验证器
 */
function validateReadme(content: string): string {
  if (typeof content !== "string") {
    console.warn(`[ReadmeManager] ⚠️ 无效的 README 内容类型:`, typeof content);
    return "";
  }

  if (content.length > 1024 * 1024) {
    // 1MB 限制
    console.warn(`[ReadmeManager] ⚠️ README 内容过大: ${content.length} 字符`);
    return content.substring(0, 1024 * 1024) + "\n\n[内容已截断...]";
  }

  return content;
}

/**
 * 内部 README 数据管理器实现
 */
class ReadmeDataManager extends GenericDataManager<string> {
  constructor() {
    super({
      cacheManager: readmeCache,
      managerName: "ReadmeManager",
      validator: validateReadme,
      enableStaleCache: true, // README 数据可以使用过期缓存降级
    });
  }

  protected getDataInfo(data: string): string {
    const lines = data.split("\n").length;
    const chars = data.length;
    return `${chars} 字符, ${lines} 行`;
  }
}

// 创建单例实例
const readmeDataManager = new ReadmeDataManager();

/**
 * README 数据管理器
 * 提供统一的 README 缓存管理
 */
export class ReadmeManager {
  /**
   * 获取指定 GitHub 仓库的 README，优先从缓存获取
   */
  async getReadme(
    githubUrl: string,
    fetchFn: () => Promise<string>
  ): Promise<string> {
    return readmeDataManager.getData(githubUrl, fetchFn);
  }

  /**
   * 强制刷新 README 数据
   */
  async refreshReadme(
    githubUrl: string,
    fetchFn: () => Promise<string>
  ): Promise<string> {
    return readmeDataManager.getData(githubUrl, fetchFn, true);
  }

  /**
   * 清除指定 GitHub 仓库的 README 缓存
   */
  clearReadme(githubUrl: string): void {
    readmeDataManager.clearCache(githubUrl);
  }

  /**
   * 清除所有 README 缓存
   */
  clearAllReadme(): void {
    readmeDataManager.clearCache();
  }

  /**
   * 手动设置 README 缓存
   */
  setReadme(githubUrl: string, content: string): void {
    readmeDataManager.setData(githubUrl, content);
  }

  /**
   * 获取缓存的 README（不会触发网络请求）
   */
  getCachedReadme(githubUrl: string): string | null {
    return readmeDataManager.getCachedData(githubUrl);
  }

  /**
   * 检查指定 GitHub 仓库的 README 是否已缓存
   */
  hasReadme(githubUrl: string): boolean {
    return readmeDataManager.hasData(githubUrl);
  }

  /**
   * 预热缓存
   */
  async preloadReadme(
    githubUrl: string,
    fetchFn: () => Promise<string>
  ): Promise<void> {
    return readmeDataManager.preloadData(githubUrl, fetchFn);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { count: number; totalSize: number } {
    return readmeDataManager.getCacheStats();
  }
}

// 导出单例实例
export const readmeManager = new ReadmeManager();

// 导出推荐使用的数据管理器实例
export { readmeDataManager };
