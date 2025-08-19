"use server";
import { getCurrentUser } from "@/actions/auth.actions";
import { AssignmentRequestService } from "@/services/assignmentRequest.service";
import { updateIssueAssigneeAction } from "@/actions/issue.actions";
import type {
  AssignmentRequest,
  AssignmentRequestStatus,
} from "@/types/database.types";

export async function listAssignmentRequestsAction(
  issueId: string
): Promise<AssignmentRequest[]> {
  return await AssignmentRequestService.listByIssue(issueId);
}

export async function requestAssignmentToEditorsAction(
  issueId: string,
  message?: string | null
): Promise<AssignmentRequest[]> {
  const me = await getCurrentUser();
  if (!me) throw new Error("User not found");
  return await AssignmentRequestService.requestToEditors(issueId, me.id, message);
}

export async function acceptAssignmentRequestAction(
  issueId: string,
  requesterId: string
): Promise<AssignmentRequest> {
  const me = await getCurrentUser();
  if (!me) throw new Error("User not found");
  const updated = await AssignmentRequestService.setStatus(issueId, requesterId, me.id, "accepted");
  // 设置 assignee 为请求者
  try {
    await updateIssueAssigneeAction(issueId, requesterId);
  } catch (e) {
    console.error("Failed to set assignee after accepting request", e);
  }
  return updated;
}

export async function refuseAssignmentRequestAction(
  issueId: string,
  requesterId: string
): Promise<AssignmentRequest> {
  const me = await getCurrentUser();
  if (!me) throw new Error("User not found");
  return await AssignmentRequestService.setStatus(issueId, requesterId, me.id, "refused");
}


