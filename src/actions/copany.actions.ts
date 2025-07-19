"use server";

import { getCurrentUser } from "@/actions/auth.actions";
import { CopanyService } from "@/services/copany.service";
import { getGithubAccessToken } from "@/services/github.service";
import { Octokit } from "@octokit/rest";
import { Copany } from "@/types/database.types";
import { RestEndpointMethodTypes } from "@octokit/rest";

/**
 * Create new company - Server Action
 */
export async function createCopanyAction(
  copanyData: Omit<Copany, "id" | "created_at" | "updated_at" | "created_by">
) {
  console.log("🏢 Starting to create copany:", copanyData);

  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      console.error("❌ User not logged in");
      throw new Error("User not logged in");
    }

    const accessToken = await getGithubAccessToken();

    if (!accessToken) {
      console.error("❌ Failed to get GitHub access token");
      throw new Error("Failed to get GitHub access token");
    }

    // Create company
    const newCopany = await CopanyService.createCopany({
      ...copanyData,
      created_by: user.id,
    });

    console.log(
      "✅ Company created successfully:",
      newCopany.id,
      "Logo URL:",
      newCopany.logo_url
    );
    return { success: true, copany: newCopany };
  } catch (error) {
    console.error("❌ Failed to create company:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
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

/**
 * Get company details - Server Action
 */
export async function getCopanyByIdAction(copanyId: string) {
  try {
    const copany = await CopanyService.getCopanyById(copanyId);
    return copany;
  } catch (error) {
    console.error("❌ Failed to get company details:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to get company details: ${error.message}`);
    } else {
      throw new Error("Failed to get company details: Unknown error");
    }
  }
}

/**
 * Update company - Server Action
 */
export async function updateCopanyAction(
  copany: Omit<Copany, "created_at" | "updated_at">
) {
  try {
    const updatedCopany = await CopanyService.updateCopany(copany);
    return updatedCopany;
  } catch (error) {
    console.error("❌ Failed to update company:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to update company: ${error.message}`);
    } else {
      throw new Error("Failed to update company: Unknown error");
    }
  }
}

export async function deleteCopanyAction(copanyId: string) {
  try {
    await CopanyService.deleteCopany(copanyId);
  } catch (error) {
    console.error("❌ Failed to delete company:", error);
    throw error;
  }
}
