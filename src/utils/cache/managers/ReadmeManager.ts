import { readmeCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

/**
 * README data validator
 */
function validateReadme(content: string): string {
  if (typeof content !== "string") {
    console.warn(
      `[ReadmeManager] ⚠️ Invalid README content type:`,
      typeof content
    );
    return "";
  }

  if (content.length > 1024 * 1024) {
    // 1MB limit
    console.warn(
      `[ReadmeManager] ⚠️ README content too large: ${content.length} characters`
    );
    return content.substring(0, 1024 * 1024) + "\n\n[Content truncated...]";
  }

  return content;
}

/**
 * Internal README data manager implementation
 */
class ReadmeDataManager extends GenericDataManager<string> {
  constructor() {
    super({
      cacheManager: readmeCache,
      managerName: "ReadmeManager",
      validator: validateReadme,
      enableStaleCache: true, // README data can use stale cache for fallback
    });
  }

  protected getDataInfo(data: string): string {
    const lines = data.split("\n").length;
    const chars = data.length;
    return `${chars} characters, ${lines} lines`;
  }
}

// Create singleton instance
const readmeDataManager = new ReadmeDataManager();

/**
 * README data manager
 * Provides unified README cache management
 */
export class ReadmeManager {
  /**
   * Get README for specified GitHub repository, prioritize cache
   */
  async getReadme(
    githubUrl: string,
    fetchFn: () => Promise<string>
  ): Promise<string> {
    return readmeDataManager.getData(githubUrl, fetchFn);
  }

  /**
   * Force refresh README data
   */
  async refreshReadme(
    githubUrl: string,
    fetchFn: () => Promise<string>
  ): Promise<string> {
    return readmeDataManager.getData(githubUrl, fetchFn, true);
  }

  /**
   * Clear README cache for specified GitHub repository
   */
  clearReadme(githubUrl: string): void {
    readmeDataManager.clearCache(githubUrl);
  }

  /**
   * Clear all README cache
   */
  clearAllReadme(): void {
    readmeDataManager.clearCache();
  }

  /**
   * Manually set README cache
   */
  setReadme(githubUrl: string, content: string): void {
    readmeDataManager.setData(githubUrl, content);
  }

  /**
   * Get cached README (won't trigger network request)
   */
  getCachedReadme(githubUrl: string): string | null {
    return readmeDataManager.getCachedData(githubUrl);
  }

  /**
   * Check if README for specified GitHub repository is cached
   */
  hasReadme(githubUrl: string): boolean {
    return readmeDataManager.hasData(githubUrl);
  }

  /**
   * Preload cache
   */
  async preloadReadme(
    githubUrl: string,
    fetchFn: () => Promise<string>
  ): Promise<void> {
    return readmeDataManager.preloadData(githubUrl, fetchFn);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { count: number; totalSize: number } {
    return readmeDataManager.getCacheStats();
  }
}

// Export singleton instance
export const readmeManager = new ReadmeManager();
