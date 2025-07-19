import { CopanyContributor } from "@/types/database.types";
import { getCopanyContributorsAction } from "@/actions/copanyContributor.actions";
import { contributorsCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

/**
 * Internal contributors data manager implementation
 */
class ContributorsDataManager extends GenericDataManager<CopanyContributor[]> {
  constructor() {
    super({
      cacheManager: contributorsCache,
      managerName: "ContributorsManager",
      enableStaleCache: false, // Contributors data is relatively stable, no need for stale cache fallback
    });
  }

  protected getDataInfo(data: CopanyContributor[]): string {
    return `${data.length} contributors`;
  }
}

// Create singleton instance
const contributorsDataManager = new ContributorsDataManager();

/**
 * Contributors manager
 * Provides caching and unified contributors fetching interface
 */
export class ContributorsManager {
  /**
   * Get contributors list for specified copany, prioritize cache
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
   * Clear contributors cache for specified copany
   */
  clearContributors(copanyId: string): void {
    contributorsDataManager.clearCache(copanyId);
  }

  /**
   * Clear all contributors cache
   */
  clearAllContributors(): void {
    contributorsDataManager.clearCache();
  }

  /**
   * Manually set contributors cache
   */
  setContributors(copanyId: string, contributors: CopanyContributor[]): void {
    contributorsDataManager.setData(copanyId, contributors);
  }

  /**
   * Get cached contributors (won't trigger network request)
   */
  getCachedContributors(copanyId: string): CopanyContributor[] | null {
    return contributorsDataManager.getCachedData(copanyId);
  }

  /**
   * Check if contributors for specified copany are cached
   */
  hasContributors(copanyId: string): boolean {
    return contributorsDataManager.hasData(copanyId);
  }
}

// Export singleton instance
export const contributorsManager = new ContributorsManager();
