"use server";

import { getCurrentUser } from "@/actions/auth.actions";
import { CopanyService } from "@/services/copany.service";
import { getGithubAccessToken } from "@/services/github.service";
import {
  getUserOrg,
  getOrgPublicRepos,
  getGithubRepoInfo,
} from "@/services/github.service";
import { RestEndpointMethodTypes } from "@octokit/rest";

/**
 * 创建新公司 - Server Action
 */
export async function createCopanyAction(githubUrl: string) {
  console.log("🏢 开始创建公司:", githubUrl);

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

    const repo = await getGithubRepoInfo(accessToken, githubUrl);

    // 创建公司
    const copany = await CopanyService.createCopany({
      name: repo.name,
      description: repo.description || "",
      github_url: githubUrl,
      organization_avatar_url: repo.organization?.avatar_url || "",
      created_by: user.id,
    });

    console.log("✅ 公司创建成功:", copany.id);
    return { success: true, copany };
  } catch (error) {
    console.error("❌ 创建公司失败:", error);
    if (error instanceof Error) {
      throw new Error(`创建公司失败: ${error.message}`);
    } else {
      throw new Error("创建公司失败: 未知错误");
    }
  }
}

/**
 * 获取用户的GitHub组织和仓库 - Server Action
 */
export async function getOrgAndReposAction(): Promise<{
  success: boolean;
  data?: {
    org: RestEndpointMethodTypes["orgs"]["listForAuthenticatedUser"]["response"]["data"][0];
    repos: RestEndpointMethodTypes["repos"]["listForOrg"]["response"]["data"];
  }[];
  error?: string;
}> {
  console.log("📋 开始获取GitHub组织和仓库");

  try {
    const orgs = await getUserOrg();
    const orgWithRepos = await Promise.all(
      orgs.map(async (org) => {
        const repos = await getOrgPublicRepos(org.login);
        return { org, repos };
      })
    );

    console.log("✅ 成功获取GitHub数据");
    return { success: true, data: orgWithRepos };
  } catch (error) {
    console.error("❌ 获取GitHub数据失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return { success: false, error: errorMessage };
  }
}
