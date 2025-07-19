import { Copany } from "@/types/database.types";
import { copanyCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

/**
 * Internal Copany data manager implementation
 */
class CopanyDataManager extends GenericDataManager<Copany> {
  constructor() {
    super({
      cacheManager: copanyCache,
      managerName: "CopanyManager",
      enableStaleCache: false, // Copany data is relatively stable, no need for stale cache fallback
    });
  }

  protected getDataInfo(data: Copany): string {
    return `Project ${data.name} (${data.github_url})`;
  }
}

// Create singleton instance
const copanyDataManager = new CopanyDataManager();

/**
 * Copany data manager
 * Provides unified Copany data cache management
 */
export class CopanyManager {
  /**
   * Get specified Copany data, prioritize cache
   */
  async getCopany(
    copanyId: string,
    fetchFn: () => Promise<Copany>
  ): Promise<Copany> {
    return copanyDataManager.getData(copanyId, fetchFn);
  }

  /**
   * Force refresh Copany data
   */
  async refreshCopany(
    copanyId: string,
    fetchFn: () => Promise<Copany>
  ): Promise<Copany> {
    return copanyDataManager.getData(copanyId, fetchFn, true);
  }

  /**
   * Clear cache for specified Copany
   */
  clearCopany(copanyId: string): void {
    copanyDataManager.clearCache(copanyId);
  }

  /**
   * Clear all Copany cache
   */
  clearAllCopany(): void {
    copanyDataManager.clearCache();
  }

  /**
   * Manually set Copany cache
   */
  setCopany(copanyId: string, copany: Copany): void {
    copanyDataManager.setData(copanyId, copany);
  }

  /**
   * Get cached Copany (won't trigger network request)
   */
  getCachedCopany(copanyId: string): Copany | null {
    return copanyDataManager.getCachedData(copanyId);
  }

  /**
   * Check if specified Copany is cached
   */
  hasCopany(copanyId: string): boolean {
    return copanyDataManager.hasData(copanyId);
  }

  /**
   * Preload cache
   */
  async preloadCopany(
    copanyId: string,
    fetchFn: () => Promise<Copany>
  ): Promise<void> {
    return copanyDataManager.preloadData(copanyId, fetchFn);
  }
}

// Export singleton instance
export const copanyManager = new CopanyManager();
