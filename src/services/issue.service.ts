import {
  createSupabaseClient,
  createAdminSupabaseClient,
} from "@/utils/supabase/server";
import {
  Issue,
  IssueWithAssignee,
  AssigneeUser,
  IssuePriority,
  IssueState,
  IssueLevel,
} from "@/types/database.types";

export class IssueService {
  static async getIssues(copanyId: string): Promise<IssueWithAssignee[]> {
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

    const issues = data as Issue[];

    // Get user information for all issues with assignees
    const issuesWithAssignee = await this.enrichIssuesWithAssigneeInfo(issues);

    return issuesWithAssignee;
  }

  static async getIssue(issueId: string): Promise<IssueWithAssignee> {
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

    const issue = data as Issue;
    const issuesWithAssignee = await this.enrichIssuesWithAssigneeInfo([issue]);

    return issuesWithAssignee[0];
  }

  static async enrichIssuesWithAssigneeInfo(
    issues: Issue[]
  ): Promise<IssueWithAssignee[]> {
    // Get all unique assignee IDs
    const assigneeIds = [
      ...new Set(issues.map((issue) => issue.assignee).filter(Boolean)),
    ] as string[];

    // If there are no assignees, return the converted data directly
    if (assigneeIds.length === 0) {
      return issues.map((issue) => ({
        ...issue,
        assignee_user: null,
      }));
    }

    // Use admin client to get user information
    const adminSupabase = await createAdminSupabaseClient();
    const assigneeUsers: Record<string, AssigneeUser> = {};

    // Batch get user information
    for (const assigneeId of assigneeIds) {
      try {
        const { data: userData, error: userError } =
          await adminSupabase.auth.admin.getUserById(assigneeId);
        if (!userError && userData.user) {
          assigneeUsers[assigneeId] = {
            id: userData.user.id,
            name:
              userData.user.user_metadata?.name ||
              userData.user.email ||
              "Unknown User",
            email: userData.user.email || "",
            avatar_url: userData.user.user_metadata?.avatar_url || "",
          };
        }
      } catch (error) {
        console.error(`Error fetching user info for ${assigneeId}:`, error);
      }
    }

    // Combine issue and assignee information
    return issues.map((issue) => ({
      ...issue,
      assignee_user: issue.assignee
        ? assigneeUsers[issue.assignee] || null
        : null,
    }));
  }

  static async createIssue(
    issue: Omit<Issue, "id" | "created_at" | "updated_at" | "closed_at">
  ): Promise<IssueWithAssignee> {
    const supabase = await createSupabaseClient();
    const updatedIssue = {
      ...issue,
      closed_at:
        issue.state === IssueState.Done ||
        issue.state === IssueState.Canceled ||
        issue.state === IssueState.Duplicate
          ? new Date().toISOString()
          : null,
    };

    const { data, error } = await supabase
      .from("issue")
      .insert(updatedIssue)
      .select()
      .single();

    if (error) {
      console.error("Error creating issue:", error);
      throw new Error(`Failed to create issue: ${error.message}`);
    }

    const createdIssue = data as Issue;
    const issuesWithAssignee = await this.enrichIssuesWithAssigneeInfo([
      createdIssue,
    ]);

    return issuesWithAssignee[0];
  }

  static async updateIssue(
    issue: Omit<
      Issue,
      "created_at" | "updated_at" | "closed_at" | "created_by" | "copany_id"
    >
  ): Promise<IssueWithAssignee> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue")
      .update({
        ...issue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", issue.id)
      .select()
      .single();
    if (error) {
      console.error("Error updating issue:", error);
      throw new Error(`Failed to update issue: ${error.message}`);
    }

    const updatedIssue = data as Issue;
    const issuesWithAssignee = await this.enrichIssuesWithAssigneeInfo([
      updatedIssue,
    ]);

    return issuesWithAssignee[0];
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
  ): Promise<IssueWithAssignee> {
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", issueId)
      .select()
      .single();
    if (error) {
      console.error("Error updating issue state:", error);
      throw new Error(`Failed to update issue state: ${error.message}`);
    }

    const updatedIssue = data as Issue;
    const issuesWithAssignee = await this.enrichIssuesWithAssigneeInfo([
      updatedIssue,
    ]);

    return issuesWithAssignee[0];
  }

  static async updateIssuePriority(
    issueId: string,
    priority: IssuePriority
  ): Promise<IssueWithAssignee> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue")
      .update({ priority, updated_at: new Date().toISOString() })
      .eq("id", issueId)
      .select()
      .single();
    if (error) {
      console.error("Error updating issue priority:", error);
      throw new Error(`Failed to update issue priority: ${error.message}`);
    }

    const updatedIssue = data as Issue;
    const issuesWithAssignee = await this.enrichIssuesWithAssigneeInfo([
      updatedIssue,
    ]);

    return issuesWithAssignee[0];
  }

  static async updateIssueLevel(
    issueId: string,
    level: IssueLevel
  ): Promise<IssueWithAssignee> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue")
      .update({ level, updated_at: new Date().toISOString() })
      .eq("id", issueId)
      .select()
      .single();
    if (error) {
      console.error("Error updating issue level:", error);
      throw new Error(`Failed to update issue level: ${error.message}`);
    }

    const updatedIssue = data as Issue;
    const issuesWithAssignee = await this.enrichIssuesWithAssigneeInfo([
      updatedIssue,
    ]);

    return issuesWithAssignee[0];
  }

  static async updateIssueAssignee(
    issueId: string,
    assignee: string | null
  ): Promise<IssueWithAssignee> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue")
      .update({ assignee, updated_at: new Date().toISOString() })
      .eq("id", issueId)
      .select()
      .single();
    if (error) {
      console.error("Error updating issue assignee:", error);
      throw new Error(`Failed to update issue assignee: ${error.message}`);
    }

    const updatedIssue = data as Issue;
    const issuesWithAssignee = await this.enrichIssuesWithAssigneeInfo([
      updatedIssue,
    ]);

    return issuesWithAssignee[0];
  }

  // Comment methods
  static async getIssueComments(issueId: string) {
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
  }) {
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

  static async updateIssueComment(commentId: string, content: string) {
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

  static async deleteIssueComment(commentId: string) {
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
