"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Discussion } from "@/types/database.types";
import {
  listDiscussionsAction,
  createDiscussionAction,
  updateDiscussionAction,
  deleteDiscussionAction,
} from "@/actions/discussion.actions";

function listKey(copanyId: string) { return ["discussions", copanyId] as const; }
function discussionKey(discussionId: string) { return ["discussion", discussionId] as const; }

export function useDiscussions(copanyId: string) {
  return useQuery<Discussion[]>({
    queryKey: listKey(copanyId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/discussions?copanyId=${encodeURIComponent(copanyId)}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.discussions as Discussion[];
      } catch {
        return await listDiscussionsAction(copanyId);
      }
    },
    staleTime: 30 * 24 * 60 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

// New hook that derives single discussion from list cache (like issues)
export function useDiscussion(copanyId: string, discussionId: string) {
  return useQuery<Discussion[], unknown, Discussion | null>({
    queryKey: listKey(copanyId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/discussions?copanyId=${encodeURIComponent(copanyId)}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.discussions as Discussion[];
      } catch {
        return await listDiscussionsAction(copanyId);
      }
    },
    select: (discussions) => {
      const found = discussions.find((d) => String(d.id) === String(discussionId));
      return found ?? null;
    },
    staleTime: 30 * 24 * 60 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

export function useCreateDiscussion(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { title: string; description?: string | null; labels?: string[]; issueId?: string | null }) => {
      return createDiscussionAction({
        copanyId,
        title: vars.title,
        description: vars.description ?? null,
        labels: vars.labels ?? [],
        issueId: vars.issueId ?? null,
      });
    },
    onSuccess: (created) => {
      qc.setQueryData<Discussion[]>(listKey(copanyId), (prev) => ([created, ...(prev || [])]));
    },
  });
}

export function useUpdateDiscussion(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { discussionId: string; updates: Partial<Pick<Discussion, "title" | "description" | "labels" | "issue_id">> }) => {
      return updateDiscussionAction(vars.discussionId, vars.updates);
    },
    onSuccess: (updated) => {
      // Update the discussions list cache (primary cache)
      qc.setQueryData<Discussion[]>(listKey(copanyId), (prev) => (prev || []).map((d) => String(d.id) === String(updated.id) ? updated : d));
      // Update the single discussion cache (fallback cache)
      qc.setQueryData<Discussion>(discussionKey(updated.id), updated);
    },
  });
}

export function useDeleteDiscussion(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { discussionId: string }) => {
      await deleteDiscussionAction(vars.discussionId);
    },
    onMutate: async ({ discussionId }) => {
      await qc.cancelQueries({ queryKey: listKey(copanyId) });
      const prev = qc.getQueryData<Discussion[]>(listKey(copanyId));
      if (prev) qc.setQueryData<Discussion[]>(listKey(copanyId), prev.filter((d) => String(d.id) !== String(discussionId)));
      return { prev } as { prev?: Discussion[] };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(listKey(copanyId), ctx.prev); },
  });
}



