"use server";
import { getCurrentUser } from "@/actions/auth.actions";
import { IssueCommentService } from "@/services/issueComment.service";
import { IssueComment } from "@/types/database.types";

// Comment actions
export async function getIssueCommentsAction(issueId: string): Promise<IssueComment[]> {
  console.log("🔍 Action: getIssueCommentsAction", issueId);
  return await IssueCommentService.getIssueComments(issueId);
}

export async function createIssueCommentAction(
  issueId: string,
  content: string,
  parentId?: string
): Promise<IssueComment> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not found");
  }
  return await IssueCommentService.createIssueComment({
    issue_id: issueId,
    content,
    created_by: user.id,
    parent_id: parentId || null,
  });
}

export async function updateIssueCommentAction(
  commentId: string,
  content: string
): Promise<IssueComment> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not found");
  }
  return await IssueCommentService.updateIssueComment(commentId, content);
}

export async function deleteIssueCommentAction(commentId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not found");
  }
  return await IssueCommentService.deleteIssueComment(commentId);
} 