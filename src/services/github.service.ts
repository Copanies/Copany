import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { createSupabaseClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

/**
 * Get current user's GitHub access token
 * Priority: fetch from Supabase session first, if not available then from Cookie (for SSR scenarios)
 * @returns GitHub access token, or null if not found
 */
export async function getGithubAccessToken(): Promise<string | null> {
  try {
    console.log("🔍 Starting to get GitHub access token...");
    const supabase = await createSupabaseClient();

    // Get current user and verify identity
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("❌ Failed to get user information:", userError.message);
      // When user retrieval fails, try to get from Cookie
      return await getTokenFromCookie();
    }

    if (!user) {
      console.log(
        "ℹ️ User not logged in - No valid user found, trying to get from Cookie"
      );
      return await getTokenFromCookie();
    }

    console.log("ℹ️ User found, user ID:", user.id);

    // Since getUser() doesn't return provider_token, we need to get it from the session
    // But here we first verified the user identity
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.log("ℹ️ Unable to get session token, trying to get from Cookie");
      return await getTokenFromCookie();
    }

    // Get provider_token (GitHub access token) from session
    const accessToken = session.provider_token;

    if (!accessToken) {
      console.log(
        "⚠️ GitHub access token not found in session - provider_token is empty, trying to get from Cookie"
      );
      return await getTokenFromCookie();
    }

    // Note: Cannot modify Cookies in page components, only update in Server Action or Route Handler
    // Cookie update logic has been moved to OAuth callback handler

    console.log("✅ Successfully retrieved GitHub access token from session");
    return accessToken;
  } catch (error) {
    console.error("❌ Exception when getting GitHub access token:", error);
    // When exception occurs, try to get from Cookie
    return await getTokenFromCookie();
  }
}

/**
 * Get GitHub access token from Cookie (for SSR scenarios)
 * @returns GitHub access token, or null if not found
 */
async function getTokenFromCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("github_access_token")?.value;

    if (!token) {
      console.log("ℹ️ GitHub access token not found in Cookie");
      return null;
    }

    console.log("✅ Successfully retrieved GitHub access token from Cookie");
    return token;
  } catch (error) {
    console.error("❌ Failed to get GitHub access token from Cookie:", error);
    return null;
  }
}

/**
 * Update GitHub access token in Cookie
 * Called when a new provider_token is detected in Supabase session
 * @param token GitHub access token
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
    console.log("✅ GitHub access token Cookie updated");
  } catch (error) {
    console.error("❌ Failed to update GitHub access token Cookie:", error);
  }
}

/**
 * Clear GitHub access token from Cookie
 */
export async function clearGithubTokenCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("github_access_token");
    console.log("✅ GitHub access token Cookie cleared");
  } catch (error) {
    console.error("❌ Failed to clear GitHub access token Cookie:", error);
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
 * Get repository README without authentication
 * @param repo Repository path, in the format "owner/repo"
 * @returns Repository README content, or null if it doesn't exist
 */
export async function getPublicRepoReadme(
  repo: string
): Promise<
  RestEndpointMethodTypes["repos"]["getReadme"]["response"]["data"] | null
> {
  const octokit = new Octokit(); // No auth parameter, using anonymous request

  try {
    const response = await octokit.request(`GET /repos/${repo}/readme`);
    return response.data;
  } catch (error: unknown) {
    // If it's a 404 error (README doesn't exist), return null instead of throwing an error
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      error.status === 404
    ) {
      console.log(`ℹ️ Repository ${repo} does not have a README file`);
      return null;
    }
    // Other errors are thrown directly
    throw error;
  }
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

  // If we have an access token, use authenticated request (can access private repository README)
  if (accessToken) {
    console.log("Using authenticated request to get README");
    const octokit = new Octokit({
      auth: accessToken as string,
    });

    try {
      const response = await octokit.request(`GET /repos/${repo}/readme`);
      return response.data;
    } catch (error: unknown) {
      // If it's a 404 error (README doesn't exist), return null instead of throwing an error
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 404
      ) {
        console.log(`ℹ️ Repository ${repo} does not have a README file`);
        return null;
      }
      // Other errors are thrown directly
      throw error;
    }
  } else {
    // If we don't have an access token, try to get public repository README without authentication
    console.log(
      "No access token, trying to get public repository README anonymously"
    );
    return await getPublicRepoReadme(repo);
  }
}
