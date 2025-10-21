import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { getProviderToken } from "./userAuth.service";

// Define error type for GitHub API errors
interface GitHubError {
  status: number;
  message?: string;
}

/**
 * Get current user's GitHub access token
 * @returns GitHub access token, or null if not found
 */
export async function getGithubAccessToken(): Promise<string | null> {
  try {
    console.log("🔍 Starting to get GitHub access token...");
    
    // Get token from userAuth service
    const tokenFromAuth = await getProviderToken('github');
    if (tokenFromAuth) {
      console.log("✅ Successfully retrieved GitHub access token");
      return tokenFromAuth;
    }

    console.log("ℹ️ No GitHub token available - will use public API");
    return null;
  } catch (error) {
    console.error("❌ Exception when getting GitHub access token:", error);
    return null;
  }
}

/**
 * Get repository License without authentication
 * @param repo Repository path, in the format "owner/repo"
 * @returns Repository License content, or null if it doesn't exist
 */
export async function getPublicRepoLicense(
  repo: string
): Promise<
  RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"] | null
> {
  const octokit = new Octokit(); // No auth parameter, using anonymous request

  try {
    const response = await octokit.rest.repos.getContent({
      owner: repo.split("/")[0],
      repo: repo.split("/")[1],
      path: "LICENSE",
    });
    return response.data;
  } catch (error: unknown) {
    // If it's a 404 error (License doesn't exist), return null instead of throwing an error
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      error.status === 404
    ) {
      console.log(`ℹ️ Repository ${repo} does not have a License file`);
      return null;
    }
    // Other errors are thrown directly
    throw error;
  }
}

/**
 * Get repository License from GitHub
 * @param repo Repository name in the format "owner/repo"
 * @returns Repository License content
 *
 * API: GET https://api.github.com/repos/{owner}/{repo}/license
 */
export async function getRepoLicense(
  repo: string
): Promise<
  RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"] | null
> {
  const accessToken = await getGithubAccessToken();

  // If we have an access token, use authenticated request (can access private repository License)
  if (accessToken) {
    console.log("🔑 Using authenticated request to get License");
    const octokit = new Octokit({
      auth: accessToken as string,
    });

    try {
      const response = await octokit.rest.repos.getContent({
        owner: repo.split("/")[0],
        repo: repo.split("/")[1],
        path: "LICENSE",
      });
      return response.data;
    } catch (error: unknown) {
      // If it's a 404 error (License doesn't exist), return null instead of throwing an error
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 404
      ) {
        console.log(`ℹ️ Repository ${repo} does not have a License file`);
        return null;
      }
      // Other errors are thrown directly
      throw error;
    }
  } else {
    // If we don't have an access token, try to get public repository License without authentication
    console.log("🌐 No access token, using public API to get License");
    return await getPublicRepoLicense(repo);
  }
}

/**
 * Get repository README with specific filename without authentication
 * @param repo Repository path, in the format "owner/repo"
 * @param filename Optional filename to look for (e.g., "README.zh.md")
 * @returns Repository README content, or null if it doesn't exist
 */
export async function getPublicRepoReadmeWithFilename(
  repo: string,
  filename?: string
): Promise<RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"] | null> {
  const octokit = new Octokit();
  const [owner, repoName] = repo.split("/");
  
  // If no filename specified, use default README
  if (!filename) {
    try {
      const response = await octokit.request(`GET /repos/${repo}/readme`);
      return response.data;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        (error as GitHubError).status === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  // Try multiple candidate paths for the specified filename
  const candidatePaths = [
    filename,
    filename.replace(/\.md$/, ""), // without .md extension
    `.github/${filename}`,
    `docs/${filename}`,
  ];

  for (const path of candidatePaths) {
    try {
      const response = await octokit.rest.repos.getContent({ owner, repo: repoName, path });
      return response.data;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        (error as GitHubError).status === 404
      ) {
        // try next path
        continue;
      }
      throw error;
    }
  }
  return null;
}

/**
 * Get repository README with specific filename from GitHub
 * @param repo Repository name in the format "owner/repo"
 * @param filename Optional filename to look for (e.g., "README.zh.md")
 * @returns Repository README content, or null if it doesn't exist
 */
export async function getRepoReadmeWithFilename(
  repo: string,
  filename?: string
): Promise<RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"] | null> {
  const accessToken = await getGithubAccessToken();

  // If we have an access token, use authenticated request
  if (accessToken) {
    console.log("🔑 Using authenticated request to get README with filename");
    const octokit = new Octokit({
      auth: accessToken as string,
    });
    const [owner, repoName] = repo.split("/");

    // If no filename specified, use default README endpoint
    if (!filename) {
      try {
        const response = await octokit.request(`GET /repos/${repo}/readme`);
        return response.data;
      } catch (error: unknown) {
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          (error as GitHubError).status === 404
        ) {
          return null;
        }
        throw error;
      }
    }

    // Try multiple candidate paths for the specified filename
    const candidatePaths = [
      filename,
      filename.replace(/\.md$/, ""), // without .md extension
      `.github/${filename}`,
      `docs/${filename}`,
    ];

    for (const path of candidatePaths) {
      try {
        const response = await octokit.rest.repos.getContent({ owner, repo: repoName, path });
        return response.data;
      } catch (error: unknown) {
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          (error as GitHubError).status === 404
        ) {
          // try next path
          continue;
        }
        throw error;
      }
    }
    return null;
  } else {
    // If we don't have an access token, try to get public repository README without authentication
    console.log("🌐 No access token, using public API to get README with filename");
    return await getPublicRepoReadmeWithFilename(repo, filename);
  }
}

/**
 * Get repository CONTRIBUTING guide without authentication
 * Tries common paths in order
 */
export async function getPublicRepoContributing(
  repo: string
): Promise<RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"] | null> {
  const octokit = new Octokit();
  const [owner, repoName] = repo.split("/");
  const candidatePaths = [
    "CONTRIBUTING",
    "CONTRIBUTING.md",
    ".github/CONTRIBUTING.md",
    "docs/CONTRIBUTING.md",
  ];

  for (const path of candidatePaths) {
    try {
      const response = await octokit.rest.repos.getContent({ owner, repo: repoName, path });
      return response.data;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        (error as GitHubError).status === 404
      ) {
        // try next path
        continue;
      }
      throw error;
    }
  }
  return null;
}

/**
 * Get repository CONTRIBUTING guide from GitHub
 * Uses authenticated request when token available, falls back to public
 */
export async function getRepoContributing(
  repo: string
): Promise<RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"] | null> {
  const accessToken = await getGithubAccessToken();

  if (accessToken) {
    const octokit = new Octokit({ auth: accessToken as string });
    const [owner, repoName] = repo.split("/");
    const candidatePaths = [
      "CONTRIBUTING",
      "CONTRIBUTING.md",
      ".github/CONTRIBUTING.md",
      "docs/CONTRIBUTING.md",
    ];

    for (const path of candidatePaths) {
      try {
        const response = await octokit.rest.repos.getContent({ owner, repo: repoName, path });
        return response.data;
      } catch (error: unknown) {
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          (error as GitHubError).status === 404
        ) {
          // try next path
          continue;
        }
        throw error;
      }
    }
    return null;
  }

  return await getPublicRepoContributing(repo);
}

/**
 * Detect if content is COSL License by checking its unique characteristics
 * @param content License content
 * @returns boolean indicating if it's a COSL License
 */
function detectCOSLLicense(content: string): boolean {
  console.log("🔍 Starting COSL License detection...");

  // Normalize content for comparison
  const normalizedContent = content
    .replace(/\r\n/g, "\n") // Normalize line endings
    .trim()
    .replace(/\s+/g, " "); // Collapse all whitespace to single spaces for robust matching

  // console.log("✨ Normalized content:", normalizedContent); 

  // Scored detection with detailed logging for robustness
  const requiredPatterns = [
    /Copany Open Source License \(COSL\)/i,
    /Contribution Points \(CP\)/i,
  ];
  const strongSignals = [
    /Downstream License/i,
    /must remain under COSL/i,
  ];
  const obligationPatterns = [
    /Publicly disclose detailed revenue statements within thirty \(30\) days of receipt/i,
    /Distribute revenue in proportion to contribution points within thirty \(30\) days of receipt/i,
    /Publicly disclose records of revenue distribution/i,
    /Provide prior notice to the principal contributors before any commercialization or licensing/i,
  ];
  const minorSignals = [
    /Contribution Tracking/i,
    /Revenue Sharing/i,
  ];

  const requiredMatches = requiredPatterns.map((re) => ({ re: re, ok: re.test(normalizedContent) }));
  const strongMatches = strongSignals.map((re) => ({ re: re, ok: re.test(normalizedContent) }));
  const obligationMatches = obligationPatterns.map((re) => ({ re: re, ok: re.test(normalizedContent) }));
  const minorMatches = minorSignals.map((re) => ({ re: re, ok: re.test(normalizedContent) }));

  const requiredOk = requiredMatches.every((m) => m.ok);
  const strongOk = strongMatches.every((m) => m.ok);
  const obligationsMatched = obligationMatches.filter((m) => m.ok).length;
  const minorMatched = minorMatches.filter((m) => m.ok).length;

  // console.log("🧪 COSL requiredMatches:", requiredMatches);
  // console.log("🧪 COSL strongMatches:", strongMatches);
  // console.log("🧪 COSL obligationMatches:", obligationMatches);
  // console.log("🧪 COSL minorMatches:", minorMatches);
  // console.log("🧪 COSL scores:", { requiredOk, strongOk, obligationsMatched, minorMatched });

  const isCosl = requiredOk && strongOk && obligationsMatched >= 3 && minorMatched >= 1;
  console.log(`✨ COSL License detection result: ${isCosl}`);
  return isCosl;
}

/**
 * Get repository license type using GitHub API
 * @param repo Repository name in the format "owner/repo"
 * @returns License type string or null
 */
export async function getRepoLicenseType(repo: string): Promise<string | null> {
  try {
    console.log(`📋 Starting license detection for repo: ${repo}`);

    const [owner, repoName] = repo.split("/");
    const accessToken = await getGithubAccessToken();
    
    // First get the license content to check for COSL
    console.log("📥 Fetching license content...");
    const license = await getRepoLicense(repo);
    if (!license || Array.isArray(license) || !("content" in license)) {
      console.log("❌ No license content found");
      return null;
    }

    const base64 = (license.content as string).replace(/\n/g, "");
    const content = Buffer.from(base64, "base64").toString("utf-8");
    console.log("✅ License content fetched successfully");

    // Check for COSL first
    if (detectCOSLLicense(content)) {
      console.log("🎯 COSL License detected!");
      return "COSL";
    }

    // If not COSL and we have access token, use GitHub API to get license info
    if (accessToken) {
      console.log("🔄 Not COSL, checking GitHub API for license type...");
      const octokit = new Octokit({
        auth: accessToken,
      });
      
      try {
        const { data } = await octokit.rest.licenses.getForRepo({
          owner,
          repo: repoName,
        });

        const licenseType = data.license?.spdx_id || null;
        console.log(`✨ GitHub API returned license type: ${licenseType}`);
        return licenseType;
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          error.status === 404
        ) {
          console.log("⚠️ GitHub API returned 404 for license");
          return null;
        }
        throw error;
      }
    } else {
      console.log("ℹ️ No access token available, cannot determine license type from GitHub API");
      return null;
    }
  } catch (error) {
    console.error("❌ Failed to detect license type:", error);
    return null;
  }
}

