"use client";

import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type { Discussion } from "@/types/database.types";
import type { PaginatedDiscussions } from "@/services/discussion.service";
import {
  listDiscussionsAction,
  createDiscussionAction,
  updateDiscussionAction,
  deleteDiscussionAction,
  listAllDiscussionsAction,
  getDiscussionByIdAction,
} from "@/actions/discussion.actions";

function listKey(copanyId: string) { return ["discussions", copanyId] as const; }
function discussionKey(discussionId: string) { return ["discussion", discussionId] as const; }
function allDiscussionsKey() { return ["discussions", "all"] as const; }

export function useDiscussions(copanyId: string) {
  return useInfiniteQuery<PaginatedDiscussions, Error>({
    queryKey: listKey(copanyId),
    queryFn: async ({ pageParam = 1 }) => {
      const page = typeof pageParam === 'number' ? pageParam : 1;
      try {
        const res = await fetch(`/api/discussions?copanyId=${encodeURIComponent(copanyId)}&page=${page}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json as PaginatedDiscussions;
      } catch {
        return await listDiscussionsAction(copanyId, page);
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

// New hook that derives single discussion from list cache (like issues)
export function useDiscussion(copanyId: string, discussionId: string) {
  return useQuery({
    queryKey: ["discussion", copanyId, discussionId],
    queryFn: async () => {
      return await getDiscussionByIdAction(discussionId);
    },
    staleTime: 1 * 60 * 1000,
    enabled: !!discussionId,
  });
}

export function useCreateDiscussion(copanyId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { title: string; description?: string | null; labels?: string[]; issueId?: string | null }) => {
      return createDiscussionAction({
        copanyId: copanyId || null,
        title: vars.title,
        description: vars.description ?? null,
        labels: vars.labels ?? [],
        issueId: vars.issueId ?? null,
      });
    },
    onSuccess: () => {
      // Invalidate queries to refetch with updated data
      if (copanyId) {
        qc.invalidateQueries({ queryKey: listKey(copanyId) });
      }
      qc.invalidateQueries({ queryKey: allDiscussionsKey() });
    },
  });
}

export function useUpdateDiscussion(copanyId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { discussionId: string; updates: Partial<Pick<Discussion, "title" | "description" | "labels" | "issue_id">> }) => {
      return updateDiscussionAction(vars.discussionId, vars.updates);
    },
    onSuccess: (updated) => {
      // Invalidate queries to refetch with updated data
      if (copanyId) {
        qc.invalidateQueries({ queryKey: listKey(copanyId) });
      }
      qc.invalidateQueries({ queryKey: allDiscussionsKey() });
      // Update the single discussion cache (fallback cache)
      qc.setQueryData<Discussion>(discussionKey(updated.id), updated);
    },
  });
}

export function useDeleteDiscussion(copanyId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { discussionId: string }) => {
      await deleteDiscussionAction(vars.discussionId);
    },
    onSuccess: () => {
      // Invalidate queries to refetch with updated data
      if (copanyId) {
        qc.invalidateQueries({ queryKey: listKey(copanyId) });
      }
      qc.invalidateQueries({ queryKey: allDiscussionsKey() });
    },
  });
}

export function useDiscussionById(discussionId: string) {
  return useQuery<Discussion>({
    queryKey: discussionKey(discussionId),
    queryFn: async () => {
      return await getDiscussionByIdAction(discussionId);
    },
    staleTime: 1 * 60 * 1000,
    enabled: !!discussionId,
  });
}

export function useAllDiscussions() {
  return useInfiniteQuery<PaginatedDiscussions, Error>({
    queryKey: allDiscussionsKey(),
    queryFn: async ({ pageParam = 1 }) => {
      const page = typeof pageParam === 'number' ? pageParam : 1;
      try {
        const res = await fetch(`/api/discussions/all?page=${page}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json as PaginatedDiscussions;
      } catch {
        return await listAllDiscussionsAction(page);
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}



