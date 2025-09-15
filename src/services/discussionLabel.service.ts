import { createSupabaseClient } from "@/utils/supabase/server";
import { DiscussionLabel } from "@/types/database.types";

export class DiscussionLabelService {
  /**
   * Get all discussion labels for a copany
   */
  static async getDiscussionLabelsByCopanyId(copanyId: string): Promise<DiscussionLabel[]> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion_label")
      .select("*")
      .eq("copany_id", copanyId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching discussion labels:", error);
      throw new Error(`Failed to fetch discussion labels: ${error.message}`);
    }

    return data as DiscussionLabel[];
  }

  /**
   * Get discussion label by ID
   */
  static async getDiscussionLabelById(id: string): Promise<DiscussionLabel | null> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion_label")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching discussion label:", error);
      throw new Error(`Failed to fetch discussion label: ${error.message}`);
    }

    return data as DiscussionLabel | null;
  }

  /**
   * Create new discussion label
   */
  static async createDiscussionLabel(
    label: Omit<DiscussionLabel, "id" | "created_at" | "updated_at">
  ): Promise<DiscussionLabel> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion_label")
      .insert(label)
      .select()
      .single();

    if (error) {
      console.error("Error creating discussion label:", error);
      throw new Error(`Failed to create discussion label: ${error.message}`);
    }

    return data as DiscussionLabel;
  }

  /**
   * Update discussion label
   */
  static async updateDiscussionLabel(
    label: Omit<DiscussionLabel, "created_at" | "updated_at">
  ): Promise<DiscussionLabel> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion_label")
      .update({
        name: label.name,
        color: label.color,
        description: label.description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", label.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating discussion label:", error);
      throw new Error(`Failed to update discussion label: ${error.message}`);
    }

    return data as DiscussionLabel;
  }

  /**
   * Delete discussion label
   */
  static async deleteDiscussionLabel(id: string): Promise<void> {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
      .from("discussion_label")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting discussion label:", error);
      throw new Error(`Failed to delete discussion label: ${error.message}`);
    }
  }

  /**
   * Get multiple discussion labels by IDs
   */
  static async getDiscussionLabelsByIds(ids: string[]): Promise<DiscussionLabel[]> {
    if (ids.length === 0) return [];
    
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion_label")
      .select("*")
      .in("id", ids);

    if (error) {
      console.error("Error fetching discussion labels by IDs:", error);
      throw new Error(`Failed to fetch discussion labels: ${error.message}`);
    }

    return data as DiscussionLabel[];
  }
}
