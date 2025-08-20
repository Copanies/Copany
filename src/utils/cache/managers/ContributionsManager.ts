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
  constructor(onDataUpdated?: (key: string, data: Contribution[]) => void) {
    super({
      cacheManager: contributionsCache,
      managerName: "ContributionsManager",
      validator: validateContributions,
      enableStaleCache: true,
      onDataUpdated, // Configure data update callback
    });
  }

  protected getDataInfo(data: Contribution[]): string {
    return `${data.length} records`;
  }
}

export class ContributionsManager {
  private dataManager: ContributionsDataManager;

  constructor(onDataUpdated?: (key: string, data: Contribution[]) => void) {
    this.dataManager = new ContributionsDataManager(onDataUpdated);
  }

  async getContributions(
    copanyId: string,
    fetchFn: () => Promise<Contribution[]>
  ): Promise<Contribution[]> {
    return this.dataManager.getData(copanyId, fetchFn);
  }

  async refreshContributions(
    copanyId: string,
    fetchFn: () => Promise<Contribution[]>
  ): Promise<Contribution[]> {
    return this.dataManager.getData(copanyId, fetchFn, true);
  }
}

// 默认实例：派发统一的 cache:updated 事件
export const contributionsManager = new ContributionsManager((key, data) => {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cache:updated", {
          detail: { manager: "ContributionsManager", key, data },
        })
      );
    }
  } catch (_) {}
});
