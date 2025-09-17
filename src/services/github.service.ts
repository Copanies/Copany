import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { createSupabaseClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { getProviderToken } from "./userAuth.service";

/**
 * Get current user's GitHub access token
 * Priority: fetch from new userAuth service first, if not available then from legacy session/Cookie
 * @returns GitHub access token, or null if not found
 */
export async function getGithubAccessToken(): Promise<string | null> {
  try {
    console.log("🔍 Starting to get GitHub access token...");
    
    // Try to get token from new userAuth service first
    const tokenFromAuth = await getProviderToken('github');
    if (tokenFromAuth) {
      console.log("✅ Successfully retrieved GitHub access token from userAuth service");
      return tokenFromAuth;
    }

    // Fallback to legacy method for backward compatibility
    console.log("⚠️ No token from userAuth service, trying legacy method...");
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

    console.log("✅ Successfully retrieved GitHub access token from legacy session");
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
    console.log("Using authenticated request to get License");
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
    console.log(
      "No access token, trying to get public repository License anonymously"
    );
    return await getPublicRepoLicense(repo);
  }
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
    const octokit = new Octokit({
      auth: accessToken || undefined,
    });

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

    // If not COSL, use GitHub API to get license info
    console.log("🔄 Not COSL, checking GitHub API for license type...");
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
  } catch (error) {
    console.error("❌ Failed to detect license type:", error);
    return null;
  }
}
