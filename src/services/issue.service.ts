import { createClient } from "@/utils/supabase/server";
import { Issue, IssueState } from "@/types/database.types";

export class IssueService {
  static async getIssues(copanyId: string): Promise<Issue[]> {
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
    const { error } = await supabase.from("issue").delete().eq("id", issueId);
    if (error) {
      console.error("Error deleting issue:", error);
      throw new Error(`Failed to delete issue: ${error.message}`);
    }
  }

  static async updateIssueState(
    issueId: string,
    state: IssueState
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("issue")
      .update({ state })
      .eq("id", issueId);
    if (error) {
      console.error("Error updating issue state:", error);
      throw new Error(`Failed to update issue state: ${error.message}`);
    }
  }
}
