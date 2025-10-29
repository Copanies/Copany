"use client";

import { useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type { Discussion } from "@/types/database.types";
import type { PaginatedDiscussions } from "@/services/discussion.service";
import {
  listDiscussionsAction,
  createDiscussionAction,
  updateDiscussionAction,
  deleteDiscussionAction,
  listAllDiscussionsAction,
} from "@/actions/discussion.actions";

function listKey(copanyId: string) { return ["discussions", copanyId, "v2"] as const; } // v2: Added version to handle PaginatedDiscussions structure change
function allDiscussionsKey() { return ["discussions", "all", "v2"] as const; } // v2: Added version to handle PaginatedDiscussions structure change

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
      // First check if lastPage exists and has the required structure
      if (!lastPage || !allPages) return undefined;
      // Then check if there are more pages
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1 * 10 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

// Derive single discussion from list cache using select (like issues)
export function useDiscussion(copanyId: string, discussionId: string) {
  return useInfiniteQuery<PaginatedDiscussions, Error, Discussion | null>({
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
    select: (data) => {
      // Flatten all pages and search for the discussion
      const allDiscussions = data.pages?.flatMap((page) => page.discussions) || [];
      const found = allDiscussions.find((d) => String(d.id) === String(discussionId));
      return found ?? null;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !allPages) return undefined;
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1 * 10 * 1000,
    enabled: !!discussionId && !!copanyId,
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
      // Update list cache - derived discussions will update automatically via select
      if (copanyId) {
        qc.setQueryData<{ pages: PaginatedDiscussions[]; pageParams: unknown[] }>(
          listKey(copanyId),
          (prev) => {
            if (!prev?.pages) return prev;
            return {
              ...prev,
              pages: prev.pages.map((page) => ({
                ...page,
                discussions: page.discussions.map((d) =>
                  String(d.id) === String(updated.id) ? updated : d
                ),
              })),
            };
          }
        );
      }
      // Update global discussions list cache
      qc.setQueryData<{ pages: PaginatedDiscussions[]; pageParams: unknown[] }>(
        allDiscussionsKey(),
        (prev) => {
          if (!prev?.pages) return prev;
          return {
            ...prev,
            pages: prev.pages.map((page) => ({
              ...page,
              discussions: page.discussions.map((d) =>
                String(d.id) === String(updated.id) ? updated : d
              ),
            })),
          };
        }
      );
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
  return useInfiniteQuery<PaginatedDiscussions, Error, Discussion | null>({
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
    select: (data) => {
      // Flatten all pages and search for the discussion
      const allDiscussions = data.pages?.flatMap((page) => page.discussions) || [];
      const found = allDiscussions.find((d) => String(d.id) === String(discussionId));
      return found ?? null;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !allPages) return undefined;
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1 * 10 * 1000,
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
      // First check if lastPage exists and has the required structure
      if (!lastPage || !allPages) return undefined;
      // Then check if there are more pages
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1 * 10 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}



