"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DiscussionComment } from "@/types/database.types";
import { getDiscussionCommentsAction, createDiscussionCommentAction, updateDiscussionCommentAction, deleteDiscussionCommentAction } from "@/actions/discussionComment.actions";

function key(discussionId: string) { return ["discussionComments", discussionId] as const; }

export function useDiscussionComments(discussionId: string) {
  return useQuery<DiscussionComment[]>({
    queryKey: key(discussionId),
    queryFn: () => getDiscussionCommentsAction(discussionId),
    staleTime: 30 * 24 * 60 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

export function useCreateDiscussionComment(discussionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { content: string; parentId?: string }) => {
      return createDiscussionCommentAction(discussionId, vars.content, vars.parentId);
    },
    onSuccess: (created) => {
      qc.setQueryData<DiscussionComment[]>(key(discussionId), (prev) => ([...(prev || []), created]));
    },
  });
}

export function useUpdateDiscussionComment(discussionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { commentId: string; content: string }) => {
      return updateDiscussionCommentAction(vars.commentId, vars.content);
    },
    onSuccess: (updated) => {
      qc.setQueryData<DiscussionComment[]>(key(discussionId), (prev) => (prev || []).map((c) => String(c.id) === String(updated.id) ? updated : c));
    },
  });
}

export function useDeleteDiscussionComment(discussionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { commentId: string }) => {
      await deleteDiscussionCommentAction(vars.commentId);
    },
    onMutate: async ({ commentId }) => {
      await qc.cancelQueries({ queryKey: key(discussionId) });
      const prev = qc.getQueryData<DiscussionComment[]>(key(discussionId));
      if (prev) qc.setQueryData<DiscussionComment[]>(key(discussionId), prev.filter((c) => String(c.id) !== String(commentId)));
      return { prev } as { prev?: DiscussionComment[] };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key(discussionId), ctx.prev); },
  });
}


