"use server";

import { getCurrentUser } from "@/actions/auth.actions";
import { DiscussionService, type PaginatedDiscussions } from "@/services/discussion.service";
import type { Discussion } from "@/types/database.types";

export async function listDiscussionsAction(
  copanyId: string,
  page: number = 1
): Promise<PaginatedDiscussions> {
  return DiscussionService.listByCopany(copanyId, page);
}

export async function getDiscussionAction(discussionId: string, copanyId: string): Promise<Discussion> {
  return DiscussionService.get(discussionId, copanyId);
}

export async function createDiscussionAction(params: {
  copanyId?: string | null;
  title: string;
  description?: string | null;
  labels?: string[];
  issueId?: string | null;
}): Promise<Discussion> {
  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");
  return DiscussionService.create({
    copany_id: params.copanyId ?? null,
    title: params.title,
    description: params.description ?? null,
    labels: params.labels ?? [],
    issue_id: params.issueId ?? null,
    creator_id: user.id,
  });
}

export async function updateDiscussionAction(
  discussionId: string,
  updates: Partial<Pick<Discussion, "title" | "description" | "labels" | "issue_id">>
): Promise<Discussion> {
  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");
  return DiscussionService.update(discussionId, updates);
}

export async function deleteDiscussionAction(discussionId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");
  return DiscussionService.remove(discussionId);
}

export async function listAllDiscussionsAction(
  page: number = 1
): Promise<PaginatedDiscussions> {
  return DiscussionService.listAll(page);
}

export async function getDiscussionByIdAction(discussionId: string): Promise<Discussion> {
  return DiscussionService.getById(discussionId);
}


