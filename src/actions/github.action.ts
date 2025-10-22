"use server";
import {
  getRepoReadmeWithFilename,
  getRepoLicense,
  getRepoLicenseType,
} from "@/services/github.service";
import { getGithubAccessToken } from "@/services/github.service";
import { RestEndpointMethodTypes } from "@octokit/rest";
import { Octokit } from "@octokit/rest";
import { getRepoContributingWithFilename } from "@/services/github.service";

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

export async function getRepoReadmeWithFilenameAction(githubUrl: string, filename?: string) {
  const repoPath = extractRepoPathFromUrl(githubUrl);
  if (!repoPath) {
    throw new Error("Invalid GitHub URL");
  }
  const readme = await getRepoReadmeWithFilename(repoPath, filename);
  return readme;
}

export async function getRepoContributingAction(githubUrl: string, filename?: string) {
  const repoPath = extractRepoPathFromUrl(githubUrl);
  if (!repoPath) {
    throw new Error("Invalid GitHub URL");
  }
  const contributing = await getRepoContributingWithFilename(repoPath, filename);
  return contributing;
}

/**
 * Get current user's public repositories
 * This function REQUIRES GitHub token - will throw error if not available
 */
async function getUserPublicRepos(): Promise<
  RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"]
> {
  console.log("📋 Starting to fetch user's public repositories");

  try {
    const accessToken = await getGithubAccessToken();
    if (!accessToken) {
      throw new Error("GitHub authentication required - please reconnect your GitHub account to access your repositories");
    }

    console.log("🔑 GitHub access token obtained, creating Octokit client");
    const octokit = new Octokit({
      auth: accessToken,
    });

    console.log("🌐 Making API call to GitHub to fetch repositories");
    const response = await octokit.rest.repos.listForAuthenticatedUser({
      visibility: "public",
      sort: "updated",
      per_page: 100,
    });

    console.log(
      `✅ Successfully fetched ${response.data.length} user public repositories`
    );
    
    // Log repository names for debugging
    if (response.data.length > 0) {
      console.log("📁 Available repositories:", response.data.map(repo => repo.full_name).slice(0, 5));
    } else {
      console.log("📁 No public repositories found for this user");
    }
    
    return response.data;
  } catch (error) {
    console.error("❌ Failed to fetch user's public repositories:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("401") || error.message.includes("Unauthorized") || error.message.includes("Bad credentials")) {
        throw new Error("GitHub authentication failed - please reconnect your GitHub account");
      } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
        throw new Error("GitHub API access denied - insufficient permissions");
      } else if (error.message.includes("rate limit")) {
        throw new Error("GitHub API rate limit exceeded - please try again later");
      }
    }
    
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

    console.log(`✅ Successfully fetched ${repos.length} GitHub repositories`);
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

export async function getRepoLicenseAction(
  githubUrl: string
): Promise<
  RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"] | null
> {
  const repoPath = extractRepoPathFromUrl(githubUrl);
  if (!repoPath) {
    throw new Error("Invalid GitHub URL");
  }
  const license = await getRepoLicense(repoPath);
  return license;
}

export async function getRepoLicenseTypeAction(
  githubUrl: string
): Promise<string | null> {
  const repoPath = extractRepoPathFromUrl(githubUrl);
  if (!repoPath) {
    throw new Error("Invalid GitHub URL");
  }
  return getRepoLicenseType(repoPath);
}
