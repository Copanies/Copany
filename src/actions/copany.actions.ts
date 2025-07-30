"use server";

import { getCurrentUser } from "@/actions/auth.actions";
import { CopanyService } from "@/services/copany.service";
import { Copany } from "@/types/database.types";

import { CopanyContributorService } from "@/services/copanyContributor.service";

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

    // Create company
    const newCopany = await CopanyService.createCopany({
      ...copanyData,
      created_by: user.id,
    });

    await CopanyContributorService.createCopanyContributor(
      newCopany.id,
      user.id
    );

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
