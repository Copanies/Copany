import { createSupabaseClient } from "@/utils/supabase/server";
import type { AssignmentRequest, Issue } from "@/types/database.types";

export class AssignmentRequestService {
  static async listByCopany(copanyId: string): Promise<AssignmentRequest[]> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue_assignment_request")
      .select("*")
      .eq("copany_id", copanyId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as AssignmentRequest[];
  }

  static async listByIssue(issueId: string): Promise<AssignmentRequest[]> {
    // Guard against temporary/invalid ids (e.g., "temp") to avoid bigint casting errors
    if (!/^\d+$/.test(String(issueId))) {
      return [];
    }
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue_assignment_request")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as AssignmentRequest[];
  }

  static async createForRecipients(
    issueId: string,
    requesterId: string,
    recipientIds: string[],
    message?: string | null
  ): Promise<AssignmentRequest[]> {
    if (recipientIds.length === 0) return [];
    const supabase = await createSupabaseClient();
    // Guard: ensure there is no identical triplet already (prevent duplicates in one batch)
    // We allow multiple batches over time; dedupe is by (issue, requester, recipient)

    // Load copany_id for the issue to store redundancy for copany-level listing
    let copanyId: string | null = null;
    {
      const { data: issueRow, error: issueErr } = await supabase
        .from("issue")
        .select("copany_id")
        .eq("id", issueId)
        .single();
      if (issueErr) throw new Error(issueErr.message);
      copanyId = (issueRow?.copany_id as string) || null;
    }

    // Insert many; rely on unique index (issue_id, requester_id, recipient_id) to prevent exact duplicates
    const payload = recipientIds.map((rid) => ({
      copany_id: copanyId,
      issue_id: issueId,
      requester_id: requesterId,
      recipient_id: rid,
      message: message ?? null,
    }));
    const { data, error } = await supabase
      .from("issue_assignment_request")
      .insert(payload)
      .select();
    if (error) throw new Error(error.message);
    return (data || []) as AssignmentRequest[];
  }

  static async computeEditorRecipients(issueId: string, excludeUserId?: string): Promise<string[]> {
    const supabase = await createSupabaseClient();
    // Load issue
    const { data: issueData, error: issueErr } = await supabase
      .from("issue")
      .select("id, copany_id, created_by, assignee")
      .eq("id", issueId)
      .single();
    if (issueErr) throw new Error(issueErr.message);
    const issue = issueData as Pick<Issue, "id" | "copany_id" | "created_by" | "assignee">;
    // Load copany owner
    let ownerId: string | null = null;
    if (issue.copany_id != null) {
      const { data: copany, error: copErr } = await supabase
        .from("copany")
        .select("created_by")
        .eq("id", issue.copany_id)
        .single();
      if (copErr) throw new Error(copErr.message);
      ownerId = (copany?.created_by as string) || null;
    }
    const set = new Set<string>();
    if (issue.created_by) set.add(String(issue.created_by));
    if (ownerId) set.add(String(ownerId));
    if (issue.assignee) set.add(String(issue.assignee));
    if (excludeUserId) set.delete(String(excludeUserId));
    return Array.from(set);
  }

  static async requestToEditors(
    issueId: string,
    requesterId: string,
    message?: string | null
  ): Promise<AssignmentRequest[]> {
    const recipients = await this.computeEditorRecipients(issueId, requesterId);
    return await this.createForRecipients(issueId, requesterId, recipients, message);
  }

  static async deleteForRecipient(
    issueId: string,
    requesterId: string,
    recipientId: string
  ): Promise<void> {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
      .from("issue_assignment_request")
      .delete()
      .eq("issue_id", issueId)
      .eq("requester_id", requesterId)
      .eq("recipient_id", recipientId);
    if (error) throw new Error(error.message);
  }
}


