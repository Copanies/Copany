"use server";
import { getRepoReadme } from "@/services/github.service";

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
