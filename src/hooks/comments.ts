"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { IssueComment } from "@/types/database.types";
import { getIssueCommentsAction, createIssueCommentAction, updateIssueCommentAction, deleteIssueCommentAction } from "@/actions/issueComment.actions";

function key(issueId: string) { return ["comments", issueId] as const; }

export function useComments(issueId: string) {
  return useQuery<IssueComment[]>({
    queryKey: key(issueId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/issue-comments?issueId=${encodeURIComponent(issueId)}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.items as IssueComment[];
      } catch {
        return await getIssueCommentsAction(issueId);
      }
    },
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 1 * 60 * 1000, // 1 minute 
  });
}

export function useCreateComment(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { content: string; parentId?: string }) => {
      try {
        const res = await fetch(`/api/issue-comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ issueId, content: vars.content, parentId: vars.parentId }) });
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.item as IssueComment;
      } catch {
        return await createIssueCommentAction(issueId, vars.content, vars.parentId);
      }
    },
    onSuccess: (created) => {
      qc.setQueryData<IssueComment[]>(key(issueId), (prev) => ([...(prev || []), created]));
    }
  });
}

export function useUpdateComment(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { commentId: string; content: string }) => {
      try {
        const res = await fetch(`/api/issue-comments`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vars) });
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.item as IssueComment;
      } catch {
        return await updateIssueCommentAction(vars.commentId, vars.content);
      }
    },
    onSuccess: (updated) => {
      qc.setQueryData<IssueComment[]>(key(issueId), (prev) => (prev || []).map((c) => String(c.id) === String(updated.id) ? updated : c));
    }
  });
}

export function useDeleteComment(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { commentId: string }) => {
      try {
        const res = await fetch(`/api/issue-comments?commentId=${encodeURIComponent(vars.commentId)}`, { method: "DELETE" });
        if (!res.ok) throw new Error("request failed");
      } catch {
        await deleteIssueCommentAction(vars.commentId);
      }
    },
    onMutate: async ({ commentId }) => {
      await qc.cancelQueries({ queryKey: key(issueId) });
      const prev = qc.getQueryData<IssueComment[]>(key(issueId));
      if (prev) qc.setQueryData<IssueComment[]>(key(issueId), prev.filter((c) => String(c.id) !== String(commentId)));
      return { prev } as { prev?: IssueComment[] };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key(issueId), ctx.prev); },
  });
}


