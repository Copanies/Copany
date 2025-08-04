import { licenseCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

class LicenseDataManager extends GenericDataManager<string> {
  constructor() {
    super({
      cacheManager: licenseCache,
      managerName: "LicenseManager",
      enableStaleCache: true,
    });
  }
  protected getDataInfo(data: string): string {
    const lines = data.split("\n").length;
    const chars = data.length;
    return `${chars} characters, ${lines} lines`;
  }
}

const licenseDataManager = new LicenseDataManager();

export class LicenseManager {
  async getLicense(
    githubUrl: string,
    fetchFn: () => Promise<string>
  ): Promise<string> {
    return licenseDataManager.getData(githubUrl, fetchFn);
  }

  getCachedLicense(githubUrl: string): string | null {
    return licenseDataManager.getCachedData(githubUrl);
  }
}

export const licenseManager = new LicenseManager();
