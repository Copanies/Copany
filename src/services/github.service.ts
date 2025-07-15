import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { createSupabaseClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

/**
 * 获取当前用户的 GitHub 访问令牌
 * 优先从 Supabase session 获取，如果获取不到则从 Cookie 获取（SSR 场景）
 * @returns GitHub 访问令牌，如果未找到则返回 null
 */
export async function getGithubAccessToken(): Promise<string | null> {
  try {
    console.log("🔍 开始获取 GitHub 访问令牌...");
    const supabase = await createSupabaseClient();

    // 获取当前用户并验证身份
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("❌ 获取用户信息失败:", userError.message);
      // 用户获取失败时，尝试从 Cookie 获取
      return await getTokenFromCookie();
    }

    if (!user) {
      console.log("ℹ️ 用户未登录 - 没有找到有效用户，尝试从 Cookie 获取");
      return await getTokenFromCookie();
    }

    console.log("ℹ️ 找到用户，用户ID:", user.id);

    // 由于 getUser() 不返回 provider_token，我们需要从会话中获取
    // 但这里我们首先验证了用户身份
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.log("ℹ️ 无法获取会话令牌，尝试从 Cookie 获取");
      return await getTokenFromCookie();
    }

    // 从会话中获取 provider_token (GitHub 访问令牌)
    const accessToken = session.provider_token;

    if (!accessToken) {
      console.log(
        "⚠️ 会话中未找到 GitHub 访问令牌 - provider_token 为空，尝试从 Cookie 获取"
      );
      return await getTokenFromCookie();
    }

    // 注意：在页面组件中无法修改 Cookie，只在 Server Action 或 Route Handler 中更新
    // Cookie 更新逻辑已移至 OAuth 回调处理中

    console.log("✅ 成功从会话获取 GitHub 访问令牌");
    return accessToken;
  } catch (error) {
    console.error("❌ 获取 GitHub 访问令牌异常:", error);
    // 发生异常时，尝试从 Cookie 获取
    return await getTokenFromCookie();
  }
}

/**
 * 从 Cookie 中获取 GitHub 访问令牌（用于 SSR 场景）
 * @returns GitHub 访问令牌，如果未找到则返回 null
 */
async function getTokenFromCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("github_access_token")?.value;

    if (!token) {
      console.log("ℹ️ Cookie 中未找到 GitHub 访问令牌");
      return null;
    }

    console.log("✅ 成功从 Cookie 获取 GitHub 访问令牌");
    return token;
  } catch (error) {
    console.error("❌ 从 Cookie 获取 GitHub 访问令牌失败:", error);
    return null;
  }
}

/**
 * 更新 Cookie 中的 GitHub 访问令牌
 * 当检测到 Supabase session 中有新的 provider_token 时调用
 * @param token GitHub 访问令牌
 */
export async function updateGithubTokenCookie(token: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set("github_access_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    console.log("✅ GitHub access token Cookie 已更新");
  } catch (error) {
    console.error("❌ 更新 GitHub access token Cookie 失败:", error);
  }
}

/**
 * 清除 Cookie 中的 GitHub 访问令牌
 */
export async function clearGithubTokenCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("github_access_token");
    console.log("✅ GitHub access token Cookie 已清除");
  } catch (error) {
    console.error("❌ 清除 GitHub access token Cookie 失败:", error);
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
export async function _getGithubRepoInfo(
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
  return response.data;
}

/**
 * Get repository README from GitHub
 * @param repo Repository name in the format "owner/repo"
 * @returns Repository README content
 *
 * API: GET https://api.github.com/repos/{owner}/{repo}/readme
 */
export async function getRepoReadme(
  repo: string
): Promise<
  RestEndpointMethodTypes["repos"]["getReadme"]["response"]["data"] | null
> {
  const accessToken = await getGithubAccessToken();
  console.log("accessToken", accessToken);
  if (!accessToken) {
    return null;
  }
  const octokit = new Octokit({
    auth: accessToken as string,
  });

  try {
    const response = await octokit.request(`GET /repos/${repo}/readme`);
    console.log("response", response);
    return response.data;
  } catch (error: unknown) {
    // 如果是 404 错误（README 不存在），返回 null 而不是抛出错误
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      error.status === 404
    ) {
      console.log(`ℹ️ Repository ${repo} does not have a README file`);
      return null;
    }
    // 其他错误直接抛出
    throw error;
  }
}
