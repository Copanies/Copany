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

  static async remove(commentId: string): Promise<DiscussionComment | null> {
    const supabase = await createSupabaseClient();
    
    // First, check if this comment has any child comments (including deleted ones)
    const { data: childComments, error: checkError } = await supabase
      .from("discussion_comment")
      .select("id")
      .eq("parent_id", commentId);
    
    if (checkError) {
      console.error("Error checking child comments:", checkError);
      throw new Error(`Failed to check child comments: ${checkError.message}`);
    }
    
    const hasChildren = childComments && childComments.length > 0;
    
    if (hasChildren) {
      // Soft delete: has child comments
      const { data, error } = await supabase
        .from("discussion_comment")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", commentId)
        .select()
        .single();
      
      if (error) {
        console.error("Error soft deleting discussion comment:", error);
        throw new Error(`Failed to soft delete discussion comment: ${error.message}`);
      }
      return data as DiscussionComment;
    } else {
      // Hard delete: no child comments
      const { error } = await supabase
        .from("discussion_comment")
        .delete()
        .eq("id", commentId);
      
      if (error) {
        console.error("Error hard deleting discussion comment:", error);
        throw new Error(`Failed to hard delete discussion comment: ${error.message}`);
      }
      return null; // Indicate hard delete
    }
  }
}


