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
      if (vars.toVote) return voteDiscussionAction(discussionId);
      return unvoteDiscussionAction(discussionId);
    },
    onMutate: async (vars) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: discussionHasVotedKey(discussionId) }),
        qc.cancelQueries({ queryKey: discussionVoteCountKey(discussionId) }),
        qc.cancelQueries({ queryKey: myVotedListKey() }),
      ]);
      const prevFlag = qc.getQueryData<boolean>(discussionHasVotedKey(discussionId)) ?? false;
      const prevCount = qc.getQueryData<number>(discussionVoteCountKey(discussionId)) ?? 0;
      const prevList = qc.getQueryData<string[]>(myVotedListKey()) ?? [];

      const nextFlag = !!vars.toVote;
      const nextCount = prevCount + (vars.toVote ? 1 : -1);
      const nextList = vars.toVote
        ? Array.from(new Set([...prevList, String(discussionId)]))
        : prevList.filter((id) => String(id) !== String(discussionId));

      qc.setQueryData(discussionHasVotedKey(discussionId), nextFlag);
      qc.setQueryData(discussionVoteCountKey(discussionId), Math.max(0, nextCount));
      qc.setQueryData(myVotedListKey(), nextList);

      return { prevFlag, prevCount, prevList } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      qc.setQueryData(discussionHasVotedKey(discussionId), ctx.prevFlag);
      qc.setQueryData(discussionVoteCountKey(discussionId), ctx.prevCount);
      qc.setQueryData(myVotedListKey(), ctx.prevList);
    },
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: discussionHasVotedKey(discussionId) }),
        qc.invalidateQueries({ queryKey: discussionVoteCountKey(discussionId) }),
        qc.invalidateQueries({ queryKey: myVotedListKey() }),
      ]);
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
        return json.ids as string[];
      } catch {
        return await listMyVotedDiscussionIdsAction();
      }
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
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


