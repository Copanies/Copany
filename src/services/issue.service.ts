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

    // 获取所有有 assignee 的 issue 的用户信息
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
    // 获取所有唯一的 assignee ID
    const assigneeIds = [
      ...new Set(issues.map((issue) => issue.assignee).filter(Boolean)),
    ] as string[];

    // 如果没有 assignee，直接返回转换后的数据
    if (assigneeIds.length === 0) {
      return issues.map((issue) => ({
        ...issue,
        assignee_user: null,
      }));
    }

    // 使用 admin client 获取用户信息
    const adminSupabase = await createAdminSupabaseClient();
    const assigneeUsers: Record<string, AssigneeUser> = {};

    // 批量获取用户信息
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

    // 组合 issue 和 assignee 信息
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
    const { data, error } = await supabase
      .from("issue")
      .insert(issue)
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
      | "created_at"
      | "updated_at"
      | "assignee"
      | "closed_at"
      | "created_by"
      | "copany_id"
    >
  ): Promise<IssueWithAssignee> {
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
      .update({ priority })
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
      .update({ level })
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
      .update({ assignee })
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
}
