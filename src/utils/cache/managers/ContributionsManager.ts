import { Contribution } from "@/types/database.types";
import { contributionsCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

/**
 * Contribution data validator
 */
function validateContributions(contributions: Contribution[]): Contribution[] {
  return contributions.filter((contribution) => {
    // Basic validation
    if (!contribution.id || !contribution.user_id || !contribution.copany_id) {
      console.warn(
        `[ContributionsManager] ⚠️ Invalid contribution record:`,
        contribution
      );
      return false;
    }

    // Time validation
    if (
      contribution.year < 2020 ||
      contribution.year > new Date().getFullYear() + 1
    ) {
      console.warn(`[ContributionsManager] ⚠️ Abnormal year:`, contribution);
      return false;
    }

    if (contribution.month < 1 || contribution.month > 12) {
      console.warn(`[ContributionsManager] ⚠️ Abnormal month:`, contribution);
      return false;
    }

    return true;
  });
}

/**
 * Contribution data cache manager
 * Provides advanced caching functionality, including intelligent refresh and data validation
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
    return `${data.length} records`;
  }
}

// Create internal data manager instance
const contributionsDataManager = new ContributionsDataManager();

/**
 * Contribution data manager
 * Provides unified contribution data cache management
 */
export class ContributionsManager {
  /**
   * Get contribution data for specified Copany, prioritize cache
   */
  async getContributions(
    copanyId: string,
    fetchFn: () => Promise<Contribution[]>
  ): Promise<Contribution[]> {
    return contributionsDataManager.getData(copanyId, fetchFn);
  }

  /**
   * Force refresh contribution data
   */
  async refreshContributions(
    copanyId: string,
    fetchFn: () => Promise<Contribution[]>
  ): Promise<Contribution[]> {
    return contributionsDataManager.getData(copanyId, fetchFn, true);
  }

  /**
   * Clear contribution cache for specified Copany
   */
  clearContributions(copanyId: string): void {
    contributionsDataManager.clearCache(copanyId);
  }

  /**
   * Clear all contribution cache
   */
  clearAllContributions(): void {
    contributionsDataManager.clearCache();
  }

  /**
   * Manually set contribution cache
   */
  setContributions(copanyId: string, contributions: Contribution[]): void {
    contributionsDataManager.setData(copanyId, contributions);
  }

  /**
   * Get cached contribution data (won't trigger network request)
   */
  getCachedContributions(copanyId: string): Contribution[] | null {
    return contributionsDataManager.getCachedData(copanyId);
  }

  /**
   * Check if contributions for specified Copany are cached
   */
  hasContributions(copanyId: string): boolean {
    return contributionsDataManager.hasData(copanyId);
  }

  /**
   * Preload cache
   */
  async preloadContributions(
    copanyId: string,
    fetchFn: () => Promise<Contribution[]>
  ): Promise<void> {
    return contributionsDataManager.preloadData(copanyId, fetchFn);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { count: number; totalSize: number } {
    return contributionsDataManager.getCacheStats();
  }
}

// Export singleton instance
export const contributionsManager = new ContributionsManager();
