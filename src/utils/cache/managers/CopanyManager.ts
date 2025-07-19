import { Copany } from "@/types/database.types";
import { copanyCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

class CopanyDataManager extends GenericDataManager<Copany> {
  constructor() {
    super({
      cacheManager: copanyCache,
      managerName: "CopanyManager",
      enableStaleCache: false,
    });
  }
  protected getDataInfo(data: Copany): string {
    return `Project ${data.name} (${data.github_url})`;
  }
}

const copanyDataManager = new CopanyDataManager();

export class CopanyManager {
  async getCopany(
    copanyId: string,
    fetchFn: () => Promise<Copany>
  ): Promise<Copany> {
    return copanyDataManager.getData(copanyId, fetchFn);
  }
  setCopany(copanyId: string, copany: Copany): void {
    copanyDataManager.setData(copanyId, copany);
  }
}
export const copanyManager = new CopanyManager();
