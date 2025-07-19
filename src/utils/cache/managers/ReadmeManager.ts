import { readmeCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

class ReadmeDataManager extends GenericDataManager<string> {
  constructor() {
    super({
      cacheManager: readmeCache,
      managerName: "ReadmeManager",
      enableStaleCache: true,
    });
  }
  protected getDataInfo(data: string): string {
    const lines = data.split("\n").length;
    const chars = data.length;
    return `${chars} characters, ${lines} lines`;
  }
}

const readmeDataManager = new ReadmeDataManager();

export class ReadmeManager {
  async getReadme(
    githubUrl: string,
    fetchFn: () => Promise<string>
  ): Promise<string> {
    return readmeDataManager.getData(githubUrl, fetchFn);
  }
  getCachedReadme(githubUrl: string): string | null {
    return readmeDataManager.getCachedData(githubUrl);
  }
}
export const readmeManager = new ReadmeManager();
