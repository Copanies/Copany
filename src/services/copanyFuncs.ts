"use server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Copany, CopanyWithUser, Issue } from "@/types/types";
import { Octokit } from "@octokit/rest";
import type { RestEndpointMethodTypes } from "@octokit/rest";
import { auth, signIn } from "@/app/auth";
import { DatabaseService } from "./databaseService";

/**
 * Get all company information
 * @returns List of companies
 */
export async function getCopanies(): Promise<CopanyWithUser[]> {
  const apiService = new DatabaseService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  const copanies = await apiService.getAllCopanies();
  const typedCopanies: CopanyWithUser[] = copanies
    .filter((copany) => copany?.id !== undefined)
    .map((copany) => ({
      id: Number(copany.id),
      github_url: String(copany.github_url),
      name: String(copany.name),
      description: String(copany.description),
      created_by: String(copany.created_by),
      created_by_name: String(copany.created_by_name),
      organization_avatar_url: copany.organization_avatar_url
        ? String(copany.organization_avatar_url)
        : null,
      project_type: String(copany.project_type),
      project_stage: String(copany.project_stage),
      main_language: String(copany.main_language),
      license: String(copany.license),
      created_at: String(copany.created_at),
      updated_at: copany.updated_at ? String(copany.updated_at) : null,
    }));
  return typedCopanies;
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
  return await apiService.updateCopany(id, copany);
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
  return await apiService.createCopany(copany);
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
  return await apiService.deleteCopany(id);
}

/**
 * Get a company by ID
 * @param id Company ID
 * @returns Company information
 */
export async function getCopany(id: number): Promise<Copany> {
  const apiService = new DatabaseService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  const copany = await apiService.getCopanyById(id);
  if (!copany) {
    throw new Error("Copany not found");
  }
  const typedCopany: Copany = {
    id: Number(copany.id),
    github_url: String(copany.github_url),
    name: String(copany.name),
    description: String(copany.description),
    created_by: String(copany.created_by),
    organization_avatar_url: copany.organization_avatar_url
      ? String(copany.organization_avatar_url)
      : null,
    project_type: String(copany.project_type),
    project_stage: String(copany.project_stage),
    main_language: String(copany.main_language),
    license: String(copany.license),
    created_at: String(copany.created_at),
    updated_at: copany.updated_at ? String(copany.updated_at) : null,
  };
  return typedCopany;
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
// MARK: --- GitHub API ---

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

/**
 * Get pull requests for a specific repository
 * @param repo Repository name in the format "owner/repo"
 * @returns List of pull requests
 *
 * API: GET https://api.github.com/repos/{owner}/{repo}/pulls
 */
export async function getRepoPRs(
  repo: string
): Promise<RestEndpointMethodTypes["pulls"]["list"]["response"]["data"]> {
  const accessToken = await getGithubAccessToken();
  console.log("accessToken", accessToken);
  if (!accessToken) {
    return [];
  }
  const octokit = new Octokit({
    auth: accessToken as string,
  });
  const response = await octokit.request(`GET /repos/${repo}/pulls`);
  console.log("getRepoPRs response", response.data);
  return response.data;
}

// export async function getPRDetails(
//   pr: RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][0]
// ): Promise<CopanyPR | null> {
//   const accessToken = await getGithubAccessToken();
//   console.log("accessToken", accessToken);
//   if (!accessToken) {
//     return null;
//   }
//   const apiService = new DatabaseService(
//     (await getCloudflareContext({ async: true })).env.DB
//   );
//   const user = await apiService.getGithubUser(String(pr.user?.id));
//   if (!user) {
//     return null;
//   }
//   console.log("user", user);
//   const octokit = new Octokit({
//     auth: accessToken as string,
//   });
//   const diffResponse = await octokit.request(
//     `GET /repos/${pr.base.repo.full_name}/pulls/${pr.number}/files`
//   );
//   const diffText = diffResponse.data
//     .map(
//       (
//         file: RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][0]["files"][0]
//       ) => file.patch
//     )
//     .join("\n");
//   console.log("diffText", diffText);
//   const copanyPR: CopanyPR = {
//     ...pr,
//     diff: diffText,
//     user: {
//       id: user.id,
//       login: String(pr.user?.login),
//       avatar_url: user.avatar_url,
//       name: user.name,
//       html_url: String(pr.user?.html_url),
//     },
//   };
//   return copanyPR;
// }

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
  const response = await octokit.request(`GET /repos/${repo}/readme`);
  console.log("getRepoReadme response", response.data);
  return response.data;
}

// MARK: --- Issues ---

/**
 * Get issues for a specific company
 * @param copanyId Company ID
 * @returns List of issues
 */
export async function getAllIssues(copanyId: number): Promise<Issue[]> {
  const apiService = new DatabaseService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  const issues = await apiService.getAllIssues(copanyId);
  return issues.map((issue) => ({
    id: Number(issue.id),
    copany_id: Number(issue.copany_id),
    title: String(issue.title),
    description: String(issue.description),
    url: String(issue.url),
    state: String(issue.state),
    created_by_id: String(issue.created_by_id),
    created_at: String(issue.created_at),
    updated_at: String(issue.updated_at),
    closed_at: String(issue.closed_at),
  }));
}

export async function getIssue(id: number): Promise<Issue> {
  const apiService = new DatabaseService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  const issue = await apiService.getIssueById(id);
  return {
    id: Number(issue.id),
    copany_id: Number(issue.copany_id),
    title: String(issue.title),
    description: String(issue.description),
    url: String(issue.url),
    state: String(issue.state),
    created_by_id: String(issue.created_by_id),
    created_at: String(issue.created_at),
    updated_at: String(issue.updated_at),
    closed_at: String(issue.closed_at),
  };
}

/**
 * Create an issue for a specific company
 * @param issue Issue information
 * @returns Created issue information
 */
export async function createIssue(
  issue: Omit<Issue, "id" | "created_at" | "updated_at">
) {
  const apiService = new DatabaseService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  return await apiService.createIssue(issue);
}

export async function updateIssue(issue: Partial<Issue>) {
  const apiService = new DatabaseService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  return await apiService.updateIssue(issue);
}

export async function deleteIssue(id: number) {
  const apiService = new DatabaseService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  return await apiService.deleteIssue(id);
}
