"use server";

import { getCurrentUser } from "@/actions/auth.actions";
import { CopanyService } from "@/services/copany.service";
import { getGithubAccessToken } from "@/services/github.service";
import {
  getGithubRepoInfo,
  getUserPublicRepos,
} from "@/services/github.service";
import { Copany } from "@/types/database.types";
import { RestEndpointMethodTypes } from "@octokit/rest";

/**
 * 创建新公司 - Server Action
 */
export async function createCopanyAction(
  copanyData: Omit<Copany, "id" | "created_at" | "updated_at" | "created_by">
) {
  console.log("🏢 开始创建 copany:", copanyData);

  try {
    // 获取当前用户
    const user = await getCurrentUser();
    if (!user) {
      console.error("❌ 用户未登录");
      throw new Error("用户未登录");
    }

    const accessToken = await getGithubAccessToken();

    if (!accessToken) {
      console.error("❌ 获取GitHub访问令牌失败");
      throw new Error("获取GitHub访问令牌失败");
    }

    // 创建公司
    const newCopany = await CopanyService.createCopany({
      name: copanyData.name,
      description: copanyData.description,
      github_url: copanyData.github_url,
      logo_url: copanyData.logo_url,
      created_by: user.id,
      telegram_url: copanyData.telegram_url,
      discord_url: copanyData.discord_url,
      figma_url: copanyData.figma_url,
      notion_url: copanyData.notion_url,
    });

    console.log(
      "✅ 公司创建成功:",
      newCopany.id,
      "Logo URL:",
      newCopany.logo_url
    );
    return { success: true, copany: newCopany };
  } catch (error) {
    console.error("❌ 创建公司失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 获取用户的GitHub组织和仓库 - Server Action
 */
export async function getOrgAndReposAction(): Promise<{
  success: boolean;
  data?: RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"];
  error?: string;
}> {
  console.log("📋 开始获取GitHub仓库");

  try {
    // 只获取用户有权限的所有公共仓库（包括个人和组织仓库）
    const repos = await getUserPublicRepos();

    console.log("✅ 成功获取GitHub数据");
    return {
      success: true,
      data: repos,
    };
  } catch (error) {
    console.error("❌ 获取GitHub数据失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return { success: false, error: errorMessage };
  }
}

/**
 * 获取公司详情 - Server Action
 */
export async function getCopanyByIdAction(copanyId: string) {
  try {
    const copany = await CopanyService.getCopanyById(copanyId);
    return copany;
  } catch (error) {
    console.error("❌ 获取公司详情失败:", error);
    if (error instanceof Error) {
      throw new Error(`获取公司详情失败: ${error.message}`);
    } else {
      throw new Error("获取公司详情失败: 未知错误");
    }
  }
}

/**
 * 更新公司 - Server Action
 */
export async function updateCopanyAction(
  copany: Omit<Copany, "created_at" | "updated_at">
) {
  try {
    const updatedCopany = await CopanyService.updateCopany(copany);
    return updatedCopany;
  } catch (error) {
    console.error("❌ 更新公司失败:", error);
    if (error instanceof Error) {
      throw new Error(`更新公司失败: ${error.message}`);
    } else {
      throw new Error("更新公司失败: 未知错误");
    }
  }
}
