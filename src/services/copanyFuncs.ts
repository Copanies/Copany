"use server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { DatabaseService } from "@/services/DatabaseService";
import { Copany } from "@/types/types";
import { Octokit } from "@octokit/rest";
import type { RestEndpointMethodTypes } from "@octokit/rest";
import { auth, signIn } from "@/app/auth";

/**
 * Get all company information
 * @returns List of companies
 */
export async function getCopanies() {
  const apiService = new DatabaseService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  return await apiService.getAll();
}

/**
 * Update company information
 * @param id Company ID
 * @param copany Company information
 * @returns Updated company information
 */
export async function updateCopany(
  id: number,
  copany: Partial<Omit<Copany, "id" | "created_at" | "updated_at">>
) {
  const apiService = new DatabaseService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  return await apiService.update(id, copany);
}

/**
 * Create a company
 * @param url Company URL
 * @returns Created company information
 */
export async function createCopany(url: string) {
  console.log("createCopany", url);
  const session = await auth();
  if (!session?.user?.id) {
    console.log("Signing in");
    await signIn();
    return;
  }
  const apiService = new DatabaseService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  const accessToken = await apiService.getAccessToken(session.user.id);
  console.log("accessToken", accessToken);
  const githubRepoInfoResponse = await getGithubRepoInfo(
    accessToken as string,
    url
  );
  console.log(
    "githubRepoInfoResponse",
    githubRepoInfoResponse.full_name,
    githubRepoInfoResponse.language,
    githubRepoInfoResponse.organization?.avatar_url,
    githubRepoInfoResponse.license?.key
  );
  const copany: Omit<Copany, "id" | "created_at" | "updated_at"> = {
    name: githubRepoInfoResponse.full_name,
    description: githubRepoInfoResponse.description || "",
    github_url: githubRepoInfoResponse.html_url,
    created_by: session.user.id,
    organization_avatar_url:
      githubRepoInfoResponse.organization?.avatar_url || null,
    project_type: "Test Project Type",
    project_stage: "Test Project Stage",
    main_language: githubRepoInfoResponse.language || "Test Main Language",
    license: githubRepoInfoResponse.license?.key || "Test License",
  };
  return await apiService.create(copany);
}

/**
 * Delete a company
 * @param id Company ID
 * @returns Deleted company information
 */
export async function deleteCopany(id: number) {
  const apiService = new DatabaseService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  return await apiService.delete(id);
}

/**
 * Get GitHub access token
 * @returns GitHub access token
 */
export async function getGithubAccessToken() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  const apiService = new DatabaseService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  return await apiService.getAccessToken(session.user.id);
}

// --- GitHub API ---

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
  const { owner, repo } = parseGithubUrl(url) || { owner: "", repo: "" };
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
function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean); // Remove empty segments
    if (segments.length >= 2) {
      const [owner, repoWithExtension] = segments;
      const repo = repoWithExtension.replace(/\.git$/, "");
      return { owner, repo };
    }
    return null;
  } catch (e) {
    return null;
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
