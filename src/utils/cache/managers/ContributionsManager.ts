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

const contributionsDataManager = new ContributionsDataManager();

export class ContributionsManager {
  async getContributions(
    copanyId: string,
    fetchFn: () => Promise<Contribution[]>
  ): Promise<Contribution[]> {
    return contributionsDataManager.getData(copanyId, fetchFn);
  }
  async refreshContributions(
    copanyId: string,
    fetchFn: () => Promise<Contribution[]>
  ): Promise<Contribution[]> {
    return contributionsDataManager.getData(copanyId, fetchFn, true);
  }
}
export const contributionsManager = new ContributionsManager();
