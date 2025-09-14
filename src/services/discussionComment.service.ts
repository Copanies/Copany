import { createSupabaseClient } from "@/utils/supabase/server";
import type { DiscussionComment } from "@/types/database.types";

export class DiscussionCommentService {
  static async list(discussionId: string): Promise<DiscussionComment[]> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion_comment")
      .select("*")
      .eq("discussion_id", discussionId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching discussion comments:", error);
      throw new Error(`Failed to fetch discussion comments: ${error.message}`);
    }
    return (data as DiscussionComment[]) || [];
  }

  static async create(input: {
    discussion_id: string;
    content: string;
    created_by: string;
    parent_id?: string | null;
  }): Promise<DiscussionComment> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion_comment")
      .insert({
        discussion_id: input.discussion_id,
        content: input.content,
        created_by: input.created_by,
        parent_id: input.parent_id ?? null,
      })
      .select()
      .single();
    if (error) {
      console.error("Error creating discussion comment:", error);
      throw new Error(`Failed to create discussion comment: ${error.message}`);
    }
    return data as DiscussionComment;
  }

  static async update(commentId: string, content: string): Promise<DiscussionComment> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion_comment")
      .update({
        content,
        updated_at: new Date().toISOString(),
        is_edited: true,
      })
      .eq("id", commentId)
      .select()
      .single();
    if (error) {
      console.error("Error updating discussion comment:", error);
      throw new Error(`Failed to update discussion comment: ${error.message}`);
    }
    return data as DiscussionComment;
  }

  static async remove(commentId: string): Promise<void> {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
      .from("discussion_comment")
      .delete()
      .eq("id", commentId);
    if (error) {
      console.error("Error deleting discussion comment:", error);
      throw new Error(`Failed to delete discussion comment: ${error.message}`);
    }
  }
}


