import { Contribution } from "@/types/database.types";
import { contributionsCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

/**
 * 贡献数据验证器
 */
function validateContributions(contributions: Contribution[]): Contribution[] {
  return contributions.filter((contribution) => {
    // 基本验证
    if (!contribution.id || !contribution.user_id || !contribution.copany_id) {
      console.warn(`[ContributionsManager] ⚠️ 无效的贡献记录:`, contribution);
      return false;
    }

    // 时间验证
    if (
      contribution.year < 2020 ||
      contribution.year > new Date().getFullYear() + 1
    ) {
      console.warn(`[ContributionsManager] ⚠️ 年份异常:`, contribution);
      return false;
    }

    if (contribution.month < 1 || contribution.month > 12) {
      console.warn(`[ContributionsManager] ⚠️ 月份异常:`, contribution);
      return false;
    }

    return true;
  });
}

/**
 * 贡献数据缓存管理器
 * 提供高级缓存功能，包括智能刷新和数据验证
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
    return `${data.length} 条`;
  }
}

// 创建并导出单例实例
export const contributionsDataManager = new ContributionsDataManager();
