import { Copany } from "@/types/database.types";
import { copanyCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

class CopanyDataManager extends GenericDataManager<Copany> {
  constructor(onDataUpdated?: (key: string, data: Copany) => void) {
    super({
      cacheManager: copanyCache,
      managerName: "CopanyManager",
      enableStaleCache: false,
      onDataUpdated, // Configure data update callback
    });
  }

  protected getDataInfo(data: Copany): string {
    return `Project ${data.name} (${data.github_url})`;
  }
}

export class CopanyManager {
  private dataManager: CopanyDataManager;

  constructor(onDataUpdated?: (key: string, data: Copany) => void) {
    this.dataManager = new CopanyDataManager(onDataUpdated);
  }

  async getCopany(
    copanyId: string,
    fetchFn: () => Promise<Copany>
  ): Promise<Copany> {
    return this.dataManager.getData(copanyId, fetchFn);
  }

  setCopany(copanyId: string, copany: Copany): void {
    this.dataManager.setData(copanyId, copany);
  }
}

// 默认实例：派发统一的 cache:updated 事件
export const copanyManager = new CopanyManager((key, data) => {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cache:updated", {
          detail: { manager: "CopanyManager", key, data },
        })
      );
    }
  } catch (_) {}
});
