"use server";

import { getCurrentUser } from "@/actions/auth.actions";
import { CopanyService } from "@/services/copany.service";
import { Copany } from "@/types/database.types";

import { CopanyContributorService } from "@/services/copanyContributor.service";
import { createAdminSupabaseClient } from "@/utils/supabase/server";

/**
 * Create new company - Server Action
 */
export async function createCopanyAction(
  copanyData: {
    name: string; // name 是必需的
  } & Partial<
    Omit<Copany, "id" | "created_at" | "updated_at" | "created_by" | "name">
  >
) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      console.error("❌ User not logged in");
      throw new Error("User not logged in");
    }

    // 设置默认值，确保所有可选字段都有默认值
    const defaultCopanyData = {
      description: "",
      github_url: null,
      figma_url: null,
      notion_url: null,
      telegram_url: null,
      discord_url: null,
      logo_url: null,
      website_url: null,
      apple_app_store_url: null,
      google_play_store_url: null,
      github_repository_id: null,
      is_connected_github: false,
      license: null,
      cover_image_url: null,
      isDefaultUseCOSL: false,
      ...copanyData, // 用户提供的数据会覆盖默认值
    };

    // Check if GitHub repository is connected to Copany Bot
    let isConnectedGithub = false;
    if (defaultCopanyData.github_repository_id) {
      const supabase = await createAdminSupabaseClient();
      const { data: botInstallation } = await supabase
        .from("copany_bot_installation")
        .select("*")
        .filter(
          "repository_ids",
          "cs",
          `{${defaultCopanyData.github_repository_id}}`
        )
        .maybeSingle();

      if (botInstallation) {
        isConnectedGithub = true;
      }
    }

    // Create company
    const newCopany = await CopanyService.createCopany({
      ...defaultCopanyData,
      created_by: user.id,
      is_connected_github: isConnectedGithub,
    });

    await CopanyContributorService.createCopanyContributor(
      newCopany.id,
      user.id
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
 * Get copanies list - Server Action
 */
export async function getCopaniesAction(): Promise<Copany[]> {
  try {
    const copanies = await CopanyService.getCopanies();
    return copanies;
  } catch (error) {
    console.error("❌ Failed to get copanies:", error);
    throw error;
  }
}

export async function getCopaniesWhereUserIsContributorAction(userId: string): Promise<Copany[]> {
  try {
    const copanies = await CopanyService.getCopaniesWhereUserIsContributor(userId);
    return copanies;
  } catch (error) {
    console.error("❌ Failed to get copanies:", error);
    throw error;
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

export async function updateCopanyLicenseAction(
  copanyId: string,
  license: string | null
) {
  await CopanyService.updateCopanyLicense(copanyId, license);
}

export async function getCopaniesByIdsAction(ids: string[]): Promise<Record<string, Copany>> {
  try {
    return await CopanyService.getCopaniesByIds(ids);
  } catch (error) {
    console.error("❌ Failed to get copanies by IDs:", error);
    throw error;
  }
}
