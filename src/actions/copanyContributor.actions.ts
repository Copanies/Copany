"use server";
import { CopanyContributorService } from "@/services/copanyContributor.service";

/**
 * 获取公司贡献者列表 - Server Action
 */
export async function getCopanyContributorsAction(copanyId: string) {
  try {
    const contributors =
      await CopanyContributorService.getCopanyContributorsByCopanyId(copanyId);
    return contributors;
  } catch (error) {
    console.error("❌ 获取公司贡献者失败:", error);
    if (error instanceof Error) {
      throw new Error(`获取公司贡献者失败: ${error.message}`);
    } else {
      throw new Error("获取公司贡献者失败: 未知错误");
    }
  }
}
