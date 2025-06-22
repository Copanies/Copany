import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { createClient } from "@/utils/supabase/server";

/**
 * 获取当前用户的 GitHub 访问令牌
 * @returns GitHub 访问令牌，如果未找到则返回 null
 */
export async function getGithubAccessToken(): Promise<string | null> {
  try {
    const supabase = await createClient();

    // 获取当前会话
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("❌ 获取会话失败:", error.message);
      return null;
    }

    if (!session) {
      console.log("ℹ️ 用户未登录");
      return null;
    }

    // 从会话中获取 provider_token (GitHub 访问令牌)
    const accessToken = session.provider_token;

    if (!accessToken) {
      console.log("⚠️ 未找到 GitHub 访问令牌");
      return null;
    }

    console.log("✅ 成功获取 GitHub 访问令牌");
    return accessToken;
  } catch (error) {
    console.error("❌ 获取 GitHub 访问令牌异常:", error);
    return null;
  }
}

/**
 * Get repository information from GitHub URL
 * @param accessToken GitHub access token
 * @param url GitHub repository URL
 * @returns GitHub repository information
 *
 * Examples:
 * - https://github.com/jinhongw/Copany
 * - https://github.com/jinhongw/Copany.git
 *
 * API: GET https://api.github.com/repos/{owner}/{repo}
 */
export async function getGithubRepoInfo(
  accessToken: string,
  url: string
): Promise<RestEndpointMethodTypes["repos"]["get"]["response"]["data"]> {
  const { owner, repo } = parseGithubUrl(url);
  const octokit = new Octokit({
    auth: accessToken,
  });
  const response = await octokit.request(`GET /repos/${owner}/${repo}`);
  return response.data;
}

/**
 * Parse GitHub URL to get repository owner and name
 * @param url GitHub repository URL
 * @returns Object containing owner and repo, returns null if parsing fails
 */
function parseGithubUrl(url: string): { owner: string; repo: string } {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean); // Remove empty segments
    if (segments.length >= 2) {
      const [owner, repoWithExtension] = segments;
      const repo = repoWithExtension.replace(/\.git$/, "");
      return { owner, repo };
    }
    console.error("Error parsing GitHub URL", url);
    throw new Error("Error parsing GitHub URL");
  } catch (e) {
    console.error("Error parsing GitHub URL", e);
    throw new Error("Error parsing GitHub URL");
  }
}

/**
 * Get list of GitHub organizations the user belongs to
 * @returns List of GitHub organizations
 *
 * API: GET https://api.github.com/user/orgs
 */
export async function getUserOrg(): Promise<
  RestEndpointMethodTypes["orgs"]["listForAuthenticatedUser"]["response"]["data"]
> {
  const accessToken = await getGithubAccessToken();
  console.log("accessToken", accessToken);
  if (!accessToken) {
    return [];
  }
  const octokit = new Octokit({
    auth: accessToken as string,
  });
  const response = await octokit.request(`GET /user/orgs`);
  console.log("getUserOrg response", response.data);
  return response.data;
}

/**
 * Get public repositories for a specific organization
 * @param org Organization name
 * @returns List of public repositories
 *
 * API: GET https://api.github.com/orgs/{org}/repos
 */
export async function getOrgPublicRepos(
  org: string
): Promise<RestEndpointMethodTypes["repos"]["listForOrg"]["response"]["data"]> {
  const accessToken = await getGithubAccessToken();
  console.log("accessToken", accessToken);
  if (!accessToken) {
    return [];
  }
  const octokit = new Octokit({
    auth: accessToken as string,
  });
  const response = await octokit.request(`GET /orgs/${org}/repos`);
  console.log("getOrgPublicRepos response", response.data);
  return response.data;
}
