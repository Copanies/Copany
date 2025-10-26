"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hasVotedDiscussionAction, listMyVotedDiscussionIdsAction, voteDiscussionAction, unvoteDiscussionAction } from "@/actions/discussionVote.actions";
import { getDiscussionVoteCountAction, getDiscussionVoteCountsAction } from "@/actions/discussionVote.actions";

export function discussionVoteCountKey(discussionId: string) {
  return ["discussionVoteCount", discussionId] as const;
}
function discussionHasVotedKey(discussionId: string) {
  return ["discussionHasVoted", discussionId] as const;
}
function myVotedListKey() {
  return ["myVotedDiscussionIds"] as const;
}

export function useDiscussionVoteState(
  discussionId: string,
  options?: { countInitialData?: number; enableCountQuery?: boolean }
) {
  const enableCountQuery = options?.enableCountQuery ?? true;
  const countQuery = useQuery<number>({
    queryKey: discussionVoteCountKey(discussionId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/discussion-votes?discussionId=${encodeURIComponent(discussionId)}&type=count`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.count as number;
      } catch {
        return await getDiscussionVoteCountAction(discussionId);
      }
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    enabled: enableCountQuery,
    initialData: options?.countInitialData,
  });
  const flagQuery = useQuery<boolean>({
    queryKey: discussionHasVotedKey(discussionId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/discussion-votes?discussionId=${encodeURIComponent(discussionId)}&type=hasVoted`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.hasVoted as boolean;
      } catch {
        return await hasVotedDiscussionAction(discussionId);
      }
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
  return { countQuery, flagQuery } as const;
}

export function useToggleDiscussionVote(discussionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { toVote: boolean }) => {
      console.log("[useToggleDiscussionVote] mutationFn called:", { discussionId, toVote: vars.toVote });
      if (vars.toVote) return voteDiscussionAction(discussionId);
      return unvoteDiscussionAction(discussionId);
    },
    onMutate: async (vars) => {
      console.log("[useToggleDiscussionVote] onMutate called:", { discussionId, toVote: vars.toVote });
      
      // Cancel all relevant queries
      await Promise.all([
        qc.cancelQueries({ queryKey: discussionHasVotedKey(discussionId) }),
        qc.cancelQueries({ queryKey: discussionVoteCountKey(discussionId) }),
        qc.cancelQueries({ queryKey: myVotedListKey() }),
      ]);
      
      // Snapshot previous values
      const prevFlag = qc.getQueryData<boolean>(discussionHasVotedKey(discussionId)) ?? false;
      const prevCount = qc.getQueryData<number>(discussionVoteCountKey(discussionId)) ?? 0;
      const prevListRaw = qc.getQueryData<string[]>(myVotedListKey());
      const prevList = Array.isArray(prevListRaw) ? prevListRaw : [];
      
      // Snapshot batch vote counts caches
      const prevBatchCaches = new Map<string, Record<string, number>>();
      qc.getQueryCache().findAll({ predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === 'discussionVoteCounts';
      }}).forEach((query) => {
        const data = query.state.data as Record<string, number> | undefined;
        if (data) {
          prevBatchCaches.set(JSON.stringify(query.queryKey), { ...data });
        }
      });

      console.log("[useToggleDiscussionVote] Previous state:", { 
        prevFlag, 
        prevCount, 
        prevListLength: prevList.length,
        batchCachesCount: prevBatchCaches.size
      });

      // Calculate new values
      const nextFlag = !!vars.toVote;
      const nextCount = prevCount + (vars.toVote ? 1 : -1);
      const nextList = vars.toVote
        ? Array.from(new Set([...prevList, String(discussionId)]))
        : prevList.filter((id) => String(id) !== String(discussionId));

      console.log("[useToggleDiscussionVote] New state:", { nextFlag, nextCount, nextListLength: nextList.length });

      // Apply optimistic updates
      qc.setQueryData(discussionHasVotedKey(discussionId), nextFlag);
      qc.setQueryData(discussionVoteCountKey(discussionId), Math.max(0, nextCount));
      qc.setQueryData(myVotedListKey(), nextList);
      
      // Update all batch vote counts caches that include this discussionId
      qc.getQueryCache().findAll({ predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === 'discussionVoteCounts';
      }}).forEach((query) => {
        const data = query.state.data as Record<string, number> | undefined;
        if (data && String(discussionId) in data) {
          const updatedData = { ...data };
          updatedData[String(discussionId)] = Math.max(0, nextCount);
          qc.setQueryData(query.queryKey, updatedData);
          console.log("[useToggleDiscussionVote] Updated batch cache:", query.queryKey);
        }
      });

      console.log("[useToggleDiscussionVote] Optimistic update applied");

      return { prevFlag, prevCount, prevList, prevBatchCaches } as const;
    },
    onError: (err, _vars, ctx) => {
      console.error("[useToggleDiscussionVote] Error occurred:", err);
      if (!ctx) {
        console.log("[useToggleDiscussionVote] No context to rollback");
        return;
      }
      
      // Rollback individual queries
      console.log("[useToggleDiscussionVote] Rolling back to previous state");
      qc.setQueryData(discussionHasVotedKey(discussionId), ctx.prevFlag);
      qc.setQueryData(discussionVoteCountKey(discussionId), ctx.prevCount);
      qc.setQueryData(myVotedListKey(), Array.isArray(ctx.prevList) ? ctx.prevList : []);
      
      // Rollback batch caches
      ctx.prevBatchCaches.forEach((data, key) => {
        const queryKey = JSON.parse(key);
        qc.setQueryData(queryKey, data);
        console.log("[useToggleDiscussionVote] Rolled back batch cache:", queryKey);
      });
    },
    onSettled: async () => {
      console.log("[useToggleDiscussionVote] onSettled - Invalidating queries");
      
      // Invalidate all relevant queries
      await Promise.all([
        qc.invalidateQueries({ queryKey: discussionHasVotedKey(discussionId) }),
        qc.invalidateQueries({ queryKey: discussionVoteCountKey(discussionId) }),
        qc.invalidateQueries({ queryKey: myVotedListKey() }),
        // Also invalidate all batch vote counts queries
        qc.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key[0] === 'discussionVoteCounts';
          }
        }),
      ]);
      
      console.log("[useToggleDiscussionVote] Queries invalidated");
    },
  });
}

export function useMyVotedDiscussionIds() {
  return useQuery<string[]>({
    queryKey: myVotedListKey(),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/discussion-votes?type=myVotedList`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return Array.isArray(json.ids) ? json.ids : [];
      } catch {
        const result = await listMyVotedDiscussionIdsAction();
        return Array.isArray(result) ? result : [];
      }
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    initialData: [], // Ensure initial data is always an empty array
  });
}

function discussionVoteCountsKey(discussionIds: string[]) {
  return ["discussionVoteCounts", discussionIds.sort()];
}

export function useDiscussionVoteCounts(discussionIds: string[]) {
  return useQuery({
    queryKey: discussionVoteCountsKey(discussionIds),
    queryFn: async () => {
      try {
        const params = discussionIds.map(id => `discussionIds=${encodeURIComponent(id)}`).join('&');
        const res = await fetch(`/api/discussion-votes?${params}&type=counts`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.counts;
      } catch {
        return await getDiscussionVoteCountsAction(discussionIds);
      }
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    enabled: discussionIds.length > 0,
  });
}


