"use server";
import { getCurrentUser } from "@/actions/auth.actions";
import { DiscussionCommentService } from "@/services/discussionComment.service";
import type { DiscussionComment } from "@/types/database.types";

export async function getDiscussionCommentsAction(discussionId: string): Promise<DiscussionComment[]> {
  return DiscussionCommentService.list(discussionId);
}

export async function createDiscussionCommentAction(
  discussionId: string,
  content: string,
  parentId?: string
): Promise<DiscussionComment> {
  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");
  return DiscussionCommentService.create({
    discussion_id: discussionId,
    content,
    created_by: user.id,
    parent_id: parentId || null,
  });
}

export async function updateDiscussionCommentAction(
  commentId: string,
  content: string
): Promise<DiscussionComment> {
  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");
  return DiscussionCommentService.update(commentId, content);
}

export async function deleteDiscussionCommentAction(commentId: string): Promise<DiscussionComment | null> {
  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");
  return DiscussionCommentService.remove(commentId);
}


