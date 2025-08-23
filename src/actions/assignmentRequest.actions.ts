"use server";
import { getCurrentUser } from "@/actions/auth.actions";
import { AssignmentRequestService } from "@/services/assignmentRequest.service";
import type { AssignmentRequest } from "@/types/database.types";

export async function listAssignmentRequestsAction(
  issueId: string
): Promise<AssignmentRequest[]> {
  console.log("🔍 Action: listAssignmentRequestsAction", issueId);
  return await AssignmentRequestService.listByIssue(issueId);
}

export async function listAssignmentRequestsByCopanyAction(
  copanyId: string
): Promise<AssignmentRequest[]> {
  console.log("🔍 Action: listAssignmentRequestsByCopanyAction", copanyId);
  return await AssignmentRequestService.listByCopany(copanyId);
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
): Promise<void> {
  const me = await getCurrentUser();
  if (!me) throw new Error("User not found");
  await AssignmentRequestService.deleteAllForRequester(issueId, requesterId);
}

export async function refuseAssignmentRequestAction(
  issueId: string,
  requesterId: string
): Promise<void> {
  const me = await getCurrentUser();
  if (!me) throw new Error("User not found");
  await AssignmentRequestService.deleteAllForRequester(issueId, requesterId);
}


