import { createSupabaseClient } from "@/utils/supabase/server";
import {
  Issue,
  IssuePriority,
  IssueState,
  IssueLevel,
} from "@/types/database.types";

export class IssueService {
  static async getIssues(copanyId: string): Promise<Issue[]> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue")
      .select("*")
      .order("created_at", { ascending: true })
      .eq("copany_id", copanyId);
    if (error) {
      console.error("Error fetching issues:", error);
      throw new Error(`Failed to fetch issues: ${error.message}`);
    }
    return data as Issue[];
  }

  static async getIssue(issueId: string): Promise<Issue> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue")
      .select("*")
      .eq("id", issueId)
      .single();
    if (error) {
      console.error("Error fetching issue:", error);
      throw new Error(`Failed to fetch issue: ${error.message}`);
    }
    return data as Issue;
  }

  static async createIssue(
    issue: Omit<
      Issue,
      "id" | "created_at" | "updated_at" | "assignee" | "closed_at"
    >
  ): Promise<Issue> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue")
      .insert(issue)
      .select()
      .single();
    if (error) {
      console.error("Error creating issue:", error);
      throw new Error(`Failed to create issue: ${error.message}`);
    }
    return data as Issue;
  }

  static async updateIssue(
    issue: Omit<
      Issue,
      | "created_at"
      | "updated_at"
      | "assignee"
      | "closed_at"
      | "created_by"
      | "copany_id"
    >
  ): Promise<Issue> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue")
      .update(issue)
      .eq("id", issue.id)
      .select()
      .single();
    if (error) {
      console.error("Error updating issue:", error);
      throw new Error(`Failed to update issue: ${error.message}`);
    }
    return data as Issue;
  }

  static async deleteIssue(issueId: string): Promise<void> {
    const supabase = await createSupabaseClient();
    const { error } = await supabase.from("issue").delete().eq("id", issueId);
    if (error) {
      console.error("Error deleting issue:", error);
      throw new Error(`Failed to delete issue: ${error.message}`);
    }
  }

  static async updateIssueState(
    issueId: string,
    state: IssueState
  ): Promise<Issue> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue")
      .update({
        state,
        closed_at:
          state === IssueState.Done ||
          state === IssueState.Canceled ||
          state === IssueState.Duplicate
            ? new Date().toISOString()
            : null,
      })
      .eq("id", issueId)
      .select()
      .single();
    if (error) {
      console.error("Error updating issue state:", error);
      throw new Error(`Failed to update issue state: ${error.message}`);
    }
    return data as Issue;
  }

  static async updateIssuePriority(
    issueId: string,
    priority: IssuePriority
  ): Promise<Issue> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue")
      .update({ priority })
      .eq("id", issueId)
      .select()
      .single();
    if (error) {
      console.error("Error updating issue priority:", error);
      throw new Error(`Failed to update issue priority: ${error.message}`);
    }
    return data as Issue;
  }

  static async updateIssueLevel(
    issueId: string,
    level: IssueLevel
  ): Promise<Issue> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue")
      .update({ level })
      .eq("id", issueId)
      .select()
      .single();
    if (error) {
      console.error("Error updating issue level:", error);
      throw new Error(`Failed to update issue level: ${error.message}`);
    }
    return data as Issue;
  }
}
