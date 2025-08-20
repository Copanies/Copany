import { createSupabaseClient } from "@/utils/supabase/server";
import type {
  AssignmentRequest,
  AssignmentRequestStatus,
  Issue,
} from "@/types/database.types";

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
    // Guard: Only one in-progress (requested) batch per (issue, requester)
    {
      const { data: existingRequested, error: existingErr } = await supabase
        .from("issue_assignment_request")
        .select("id")
        .eq("issue_id", issueId)
        .eq("requester_id", requesterId)
        .eq("status", "requested");
      if (existingErr) throw new Error(existingErr.message);
      if ((existingRequested || []).length > 0) {
        throw new Error("There is already an in-progress assignment request for this issue and requester.");
      }
    }

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

    // Insert many; we rely on partial unique index (status='requested') to prevent duplicates in-progress
    const payload = recipientIds.map((rid) => ({
      copany_id: copanyId,
      issue_id: issueId,
      requester_id: requesterId,
      recipient_id: rid,
      message: message ?? null,
      status: "requested" as AssignmentRequestStatus,
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

  static async setStatus(
    issueId: string,
    requesterId: string,
    recipientId: string,
    status: AssignmentRequestStatus
  ): Promise<AssignmentRequest> {
    const supabase = await createSupabaseClient();
    // 1) 更新状态，触发活动、通知与自动 skip
    const { data, error } = await supabase
      .from("issue_assignment_request")
      .update({ status })
      .eq("issue_id", issueId)
      .eq("requester_id", requesterId)
      .eq("recipient_id", recipientId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    const updated = data as AssignmentRequest;

    // 2) 在产生副作用后，删除该 requester 的本批记录（accepted/refused 会导致本批其余记录被 skip）
    try {
      await supabase
        .from("issue_assignment_request")
        .delete()
        .eq("issue_id", issueId)
        .eq("requester_id", requesterId);
    } catch (_) {}

    return updated;
  }
}


