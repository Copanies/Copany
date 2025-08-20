import { CopanyContributor } from "@/types/database.types";
import { getCopanyContributorsAction } from "@/actions/copanyContributor.actions";
import { contributorsCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

class ContributorsDataManager extends GenericDataManager<CopanyContributor[]> {
  constructor(onDataUpdated?: (key: string, data: CopanyContributor[]) => void) {
    super({
      cacheManager: contributorsCache,
      managerName: "ContributorsManager",
      enableStaleCache: false,
      onDataUpdated,
    });
  }
  protected getDataInfo(data: CopanyContributor[]): string {
    return `${data.length} contributors`;
  }
}

const contributorsDataManager = new ContributorsDataManager((key, data) => {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cache:updated", {
          detail: { manager: "ContributorsManager", key, data },
        })
      );
    }
  } catch (_) {}
});

export class ContributorsManager {
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
}
export const contributorsManager = new ContributorsManager();
