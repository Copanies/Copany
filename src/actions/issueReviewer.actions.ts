"use server";
import { getCurrentUser } from "@/actions/auth.actions";
import { IssueReviewerService } from "@/services/issueReviewer.service";
import type { IssueReviewer, ReviewerStatus } from "@/types/database.types";

export async function listIssueReviewersAction(
  issueId: string
): Promise<IssueReviewer[]> {
  return await IssueReviewerService.list(issueId);
}

export async function approveMyReviewAction(
  issueId: string
): Promise<IssueReviewer> {
  const me = await getCurrentUser();
  if (!me) throw new Error("User not found");
  return await IssueReviewerService.setStatus(issueId, me.id, "approved");
}

export async function addReviewerAction(
  issueId: string,
  reviewerId: string
): Promise<IssueReviewer> {
  const me = await getCurrentUser();
  if (!me) throw new Error("User not found");
  // For now allow anyone to add; RLS will check insert allowed. Later constrain by permissions.
  return await IssueReviewerService.add(issueId, reviewerId);
}

export async function setReviewerStatusAction(
  issueId: string,
  reviewerId: string,
  status: ReviewerStatus
): Promise<IssueReviewer> {
  const me = await getCurrentUser();
  if (!me) throw new Error("User not found");
  return await IssueReviewerService.setStatus(issueId, reviewerId, status);
}


