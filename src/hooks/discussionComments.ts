"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DiscussionComment } from "@/types/database.types";
import { getDiscussionCommentsAction, createDiscussionCommentAction, updateDiscussionCommentAction, deleteDiscussionCommentAction } from "@/actions/discussionComment.actions";

function key(discussionId: string) { return ["discussionComments", discussionId] as const; }

export function useDiscussionComments(discussionId: string) {
  return useQuery<DiscussionComment[]>({
    queryKey: key(discussionId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/discussion-comments?discussionId=${encodeURIComponent(discussionId)}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.comments as DiscussionComment[];
      } catch {
        return await getDiscussionCommentsAction(discussionId);
      }
    },
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
      // Update comments list
      qc.setQueryData<DiscussionComment[]>(key(discussionId), (prev) => ([...(prev || []), created]));
      
      // Refetch discussion data to get updated comment_count from database triggers
      qc.invalidateQueries({ queryKey: ["discussion", discussionId] });
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
      return deleteDiscussionCommentAction(vars.commentId);
    },
    onMutate: async ({ commentId }) => {
      await qc.cancelQueries({ queryKey: key(discussionId) });
      const prev = qc.getQueryData<DiscussionComment[]>(key(discussionId));
      
      // Optimistically remove from cache (will be restored if needed based on result)
      if (prev) {
        qc.setQueryData<DiscussionComment[]>(key(discussionId), 
          prev.filter((c) => String(c.id) !== String(commentId))
        );
      }
      
      return { prev } as { prev?: DiscussionComment[] };
    },
    onSuccess: (result, { commentId }) => {
      if (result) {
        // Soft delete: update cache with soft-deleted comment
        qc.setQueryData<DiscussionComment[]>(key(discussionId), (prev) => {
          if (!prev) return prev;
          const filtered = prev.filter((c) => String(c.id) !== String(commentId));
          return [...filtered, result];
        });
      } else {
        // Hard delete: comment is already removed from cache in onMutate
        // No additional action needed
      }
      
      // Refetch discussion data to get updated comment_count from database triggers
      qc.invalidateQueries({ queryKey: ["discussion", discussionId] });
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(discussionId), ctx.prev);
    },
  });
}


