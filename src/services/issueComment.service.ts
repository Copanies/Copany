import {
  createSupabaseClient,
} from "@/utils/supabase/server";
import {
  IssueComment,
} from "@/types/database.types";

export class IssueCommentService {
  static async getIssueComments(issueId: string): Promise<IssueComment[]> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue_comment")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true });
    
    if (error) {
      console.error("Error fetching issue comments:", error);
      throw new Error(`Failed to fetch issue comments: ${error.message}`);
    }

    return data;
  }

  static async createIssueComment(comment: {
    issue_id: string;
    content: string;
    created_by: string;
    parent_id: string | null;
  }): Promise<IssueComment> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue_comment")
      .insert(comment)
      .select()
      .single();
    
    if (error) {
      console.error("Error creating issue comment:", error);
      throw new Error(`Failed to create issue comment: ${error.message}`);
    }

    return data;
  }

  static async updateIssueComment(commentId: string, content: string): Promise<IssueComment> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue_comment")
      .update({ 
        content, 
        updated_at: new Date().toISOString(),
        is_edited: true 
      })
      .eq("id", commentId)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating issue comment:", error);
      throw new Error(`Failed to update issue comment: ${error.message}`);
    }

    return data;
  }

  static async deleteIssueComment(commentId: string): Promise<void> {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
      .from("issue_comment")
      .delete()
      .eq("id", commentId);
    
    if (error) {
      console.error("Error deleting issue comment:", error);
      throw new Error(`Failed to delete issue comment: ${error.message}`);
    }
  }
} 