"use server";

import { getCurrentUser } from "@/actions/auth.actions";
import { DiscussionLabelService } from "@/services/discussionLabel.service";
import { DiscussionLabel } from "@/types/database.types";

/**
 * Get all discussion labels for a copany - Server Action
 */
export async function getDiscussionLabelsByCopanyIdAction(copanyId: string) {
  try {
    const labels = await DiscussionLabelService.getDiscussionLabelsByCopanyId(copanyId);
    return { success: true, labels };
  } catch (error) {
    console.error("❌ Failed to get discussion labels:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create new discussion label - Server Action
 */
export async function createDiscussionLabelAction(
  labelData: {
    copany_id: string;
    name: string;
    color?: string;
    description?: string;
  }
) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      console.error("❌ User not logged in");
      throw new Error("User not logged in");
    }

    // Set default values
    const defaultLabelData = {
      color: "#6B7280", // Default gray color
      description: null,
      ...labelData,
    };

    // Create discussion label
    const newLabel = await DiscussionLabelService.createDiscussionLabel({
      ...defaultLabelData,
      creator_id: user.id,
    });

    return { success: true, label: newLabel };
  } catch (error) {
    console.error("❌ Failed to create discussion label:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update discussion label - Server Action
 */
export async function updateDiscussionLabelAction(
  labelData: Omit<DiscussionLabel, "created_at" | "updated_at">
) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      console.error("❌ User not logged in");
      throw new Error("User not logged in");
    }

    // Update discussion label
    const updatedLabel = await DiscussionLabelService.updateDiscussionLabel(labelData);

    return { success: true, label: updatedLabel };
  } catch (error) {
    console.error("❌ Failed to update discussion label:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete discussion label - Server Action
 */
export async function deleteDiscussionLabelAction(labelId: string) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      console.error("❌ User not logged in");
      throw new Error("User not logged in");
    }

    // Delete discussion label
    await DiscussionLabelService.deleteDiscussionLabel(labelId);

    return { success: true };
  } catch (error) {
    console.error("❌ Failed to delete discussion label:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get discussion labels by IDs - Server Action
 */
export async function getDiscussionLabelsByIdsAction(ids: string[]) {
  try {
    const labels = await DiscussionLabelService.getDiscussionLabelsByIds(ids);
    return { success: true, labels };
  } catch (error) {
    console.error("❌ Failed to get discussion labels by IDs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
