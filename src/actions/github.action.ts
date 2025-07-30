"use server";
import { getRepoReadme } from "@/services/github.service";
import { getGithubAccessToken } from "@/services/github.service";
import { RestEndpointMethodTypes } from "@octokit/rest";
import { Octokit } from "@octokit/rest";

/**
 * Extract repository path from GitHub URL
 * @param url GitHub repository URL
 * @returns Repository path (format: owner/repo), returns null if parsing fails
 */
function extractRepoPathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Ensure it's a GitHub domain
    if (urlObj.hostname !== "github.com") {
      console.warn("⚠️ Not a GitHub URL:", urlObj.hostname);
      return null;
    }

    // Extract path part, remove leading / and possible .git suffix
    const path = urlObj.pathname.replace(/^\//, "").replace(/\.git$/, "");

    // Split the path
    const pathParts = path.split("/");

    if (pathParts.length < 2) {
      console.warn("⚠️ GitHub URL path format is incorrect:", path);
      return null;
    }

    const owner = pathParts[0];
    const repo = pathParts[1];

    if (!owner || !repo) {
      console.warn("⚠️ Unable to extract owner or repo:", { owner, repo });
      return null;
    }

    return `${owner}/${repo}`;
  } catch (error) {
    console.error("❌ GitHub URL parsing failed:", error);
    return null;
  }
}

export async function getRepoReadmeAction(githubUrl: string) {
  const repoPath = extractRepoPathFromUrl(githubUrl);
  if (!repoPath) {
    throw new Error("Invalid GitHub URL");
  }
  const readme = await getRepoReadme(repoPath);
  return readme;
}

/**
 * Get current user's public repositories
 */
async function getUserPublicRepos(): Promise<
  RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"]
> {
  console.log("📋 Starting to fetch user's public repositories");

  try {
    const accessToken = await getGithubAccessToken();
    if (!accessToken) {
      throw new Error("Failed to get GitHub access token");
    }

    const octokit = new Octokit({
      auth: accessToken,
    });

    const response = await octokit.rest.repos.listForAuthenticatedUser({
      visibility: "public",
      sort: "updated",
      per_page: 100,
    });

    console.log(
      `✅ Successfully fetched ${response.data.length} user public repositories`
    );
    return response.data;
  } catch (error) {
    console.error("❌ Failed to fetch user's public repositories:", error);
    throw error;
  }
}

/**
 * Get user's GitHub organizations and repositories - Server Action
 */
export async function getOrgAndReposAction(): Promise<{
  success: boolean;
  data?: RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"];
  error?: string;
}> {
  console.log("📋 Starting to fetch GitHub repositories");

  try {
    // Only get all public repositories the user has access to (including personal and organization repos)
    const repos = await getUserPublicRepos();

    console.log("✅ Successfully fetched GitHub data");
    return {
      success: true,
      data: repos,
    };
  } catch (error) {
    console.error("❌ Failed to fetch GitHub data:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}
