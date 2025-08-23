"use server";
import { CopanyContributorService } from "@/services/copanyContributor.service";

/**
 * Get company contributors list - Server Action
 */
export async function getCopanyContributorsAction(copanyId: string) {
  console.log("🔍 Action: getCopanyContributorsAction", copanyId);
  try {
    const contributors =
      await CopanyContributorService.getCopanyContributorsByCopanyId(copanyId);
    return contributors;
  } catch (error) {
    console.error("❌ Failed to get company contributors:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to get company contributors: ${error.message}`);
    } else {
      throw new Error("Failed to get company contributors: Unknown error");
    }
  }
}
