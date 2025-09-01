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
  type IssueReviewer,
} from "@/types/database.types";
import { IssueReviewerService } from "./issueReviewer.service";

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

  static async deleteIssue(issueId: string): Promise<void> {
    const supabase = await createSupabaseClient();
    const { error } = await supabase.from("issue").delete().eq("id", issueId);
    if (error) {
      console.error("Error deleting issue:", error);
      throw new Error(`Failed to delete issue: ${error.message}`);
    }
  }

  static async updateIssueTitleAndDescription(
    issueId: string,
    title: string,
    description: string,
    expectedVersion?: number,
    baseTitle?: string | null,
    baseDescription?: string | null,
    actorUserId?: string | null
  ): Promise<IssueWithAssignee> {
    const supabase = await createSupabaseClient();

    // If version not provided, fallback to simple update (legacy callers)
    if (expectedVersion === undefined || expectedVersion === null) {
      const { data, error } = await supabase
        .from("issue")
        .update({
          title,
          description,
          updated_at: new Date().toISOString(),
          content_version_updated_by: actorUserId ?? null,
          content_version_updated_at: new Date().toISOString(),
        })
        .eq("id", issueId)
        .select()
        .single();
      if (error) {
        console.error("Error updating issue title and description:", error);
        throw new Error(`Failed to update issue title and description: ${error.message}`);
      }
      const updatedIssue = data as Issue;
      const issuesWithAssignee = await this.enrichIssuesWithAssigneeInfo([updatedIssue]);
      return issuesWithAssignee[0];
    }

    // Try optimistic update with version check
    const optimisticUpdate = await supabase
      .from("issue")
      .update({
        title,
        description,
        updated_at: new Date().toISOString(),
        content_version_updated_by: actorUserId ?? null,
        content_version_updated_at: new Date().toISOString(),
        // bump version
        version: (expectedVersion ?? 0) + 1,
      })
      .eq("id", issueId)
      .eq("version", expectedVersion)
      .select()
      .single();

    if (!optimisticUpdate.error && optimisticUpdate.data) {
      const updatedIssue = optimisticUpdate.data as Issue;
      const issuesWithAssignee = await this.enrichIssuesWithAssigneeInfo([updatedIssue]);
      return issuesWithAssignee[0];
    }

    // Version conflict: fetch current, attempt auto-merge
    const currentRes = await supabase
      .from("issue")
      .select("*")
      .eq("id", issueId)
      .single();
    if (currentRes.error || !currentRes.data) {
      console.error("Error fetching current issue after conflict:", currentRes.error);
      throw new Error("Conflict and failed to fetch current issue");
    }
    const current = currentRes.data as Issue;

    // Prefer updated_by on issue; fallback to last issue_activity
    let updater: { id: string; name: string; avatar_url: string } | null = null;
    try {
      let actorId = (current as any)?.content_version_updated_by as string | undefined;
      if (!actorId) {
        const { data: lastAct } = await supabase
          .from("issue_activity")
          .select("actor_id, created_at")
          .eq("issue_id", issueId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        actorId = (lastAct as any)?.actor_id as string | undefined;
      }
      if (actorId) {
        const admin = await createAdminSupabaseClient();
        const { data: userData } = await admin.auth.admin.getUserById(actorId);
        const user = userData?.user;
        if (user) {
          updater = {
            id: user.id,
            name: (user.user_metadata?.name as string) || user.email || "Unknown User",
            avatar_url: (user.user_metadata?.avatar_url as string) || "",
          };
        }
      }
    } catch (_) {}

    // Lazy import to avoid circular deps
    const { merge3 } = await import("@/utils/diff3");

    const mergedTitle = merge3(
      baseTitle ?? current.title ?? "",
      current.title ?? "",
      title ?? "",
      { labelTheirs: "remote", labelYours: "local" }
    );
    const mergedDesc = merge3(
      baseDescription ?? current.description ?? "",
      current.description ?? "",
      description ?? "",
      { labelTheirs: "remote", labelYours: "local" }
    );

    // If no conflict in either, attempt to persist merged content against latest version
    if (!mergedTitle.hadConflict && !mergedDesc.hadConflict) {
      const tryMergeSave = await supabase
        .from("issue")
        .update({
          title: mergedTitle.text,
          description: mergedDesc.text,
          updated_at: new Date().toISOString(),
          content_version_updated_by: actorUserId ?? null,
          content_version_updated_at: new Date().toISOString(),
          version: (current.version ?? 0) + 1,
        })
        .eq("id", issueId)
        .eq("version", current.version)
        .select()
        .single();

      if (!tryMergeSave.error && tryMergeSave.data) {
        const updatedIssue = tryMergeSave.data as Issue;
        const issuesWithAssignee = await this.enrichIssuesWithAssigneeInfo([updatedIssue]);
        return issuesWithAssignee[0];
      }
    }

    // Still conflicting: throw a special error with payload
    const conflictError = new Error("VERSION_CONFLICT");
    // @ts-expect-error augment error object with data
    conflictError.payload = {
      conflict: true,
      server: current,
      mergedTitle: mergedTitle.text,
      mergedDescription: mergedDesc.text,
      serverVersion: current.version ?? 0,
      updater,
      updatedAt: current.content_version_updated_at ?? current.updated_at ?? null,
    };
    console.log("conflictError", conflictError);
    console.log("current", current);
    console.log("updater", updater);
    console.log("updatedAt", current.content_version_updated_at ?? current.updated_at ?? null);
    throw conflictError;
  }

  static async updateIssueState(
    issueId: string,
    state: IssueState
  ): Promise<IssueWithAssignee> {
    // Enforce rule: Only allow moving to Done when InReview and has at least one approval
    if (state === IssueState.Done) {
      const current = await this.getIssue(issueId);
      if (current.state !== IssueState.InReview) {
        throw new Error("Only allowed after review");
      }
      const reviewers: IssueReviewer[] = await IssueReviewerService.list(issueId);
      const hasApproved = reviewers.some((r) => r.status === "approved");
      if (!hasApproved) {
        throw new Error("Requires at least one approval");
      }
    }

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


}
