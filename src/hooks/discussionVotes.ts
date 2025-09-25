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
    queryFn: () => getDiscussionVoteCountAction(discussionId),
    staleTime: 30 * 24 * 60 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    enabled: enableCountQuery,
    initialData: options?.countInitialData,
  });
  const flagQuery = useQuery<boolean>({
    queryKey: discussionHasVotedKey(discussionId),
    queryFn: () => hasVotedDiscussionAction(discussionId),
    staleTime: 30 * 24 * 60 * 60 * 1000,
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
    queryFn: () => listMyVotedDiscussionIdsAction(),
    staleTime: 30 * 24 * 60 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

function discussionVoteCountsKey(discussionIds: string[]) {
  return ["discussionVoteCounts", discussionIds.sort()];
}

export function useDiscussionVoteCounts(discussionIds: string[]) {
  return useQuery({
    queryKey: discussionVoteCountsKey(discussionIds),
    queryFn: () => getDiscussionVoteCountsAction(discussionIds),
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    enabled: discussionIds.length > 0,
  });
}


