"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hasVotedDiscussionAction, listMyVotedDiscussionIdsAction, voteDiscussionAction, unvoteDiscussionAction } from "@/actions/discussionVote.actions";

export function discussionHasVotedKey(discussionId: string) {
  return ["discussionHasVoted", discussionId] as const;
}
function myVotedListKey() {
  return ["myVotedDiscussionIds"] as const;
}

export function useDiscussionVoteState(discussionId: string) {
  return useQuery<boolean>({
    queryKey: discussionHasVotedKey(discussionId),
    queryFn: () => hasVotedDiscussionAction(discussionId),
    staleTime: 30 * 24 * 60 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
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
        qc.cancelQueries({ queryKey: myVotedListKey() }),
      ]);
      const prevFlag = qc.getQueryData<boolean>(discussionHasVotedKey(discussionId)) ?? false;
      const prevList = qc.getQueryData<string[]>(myVotedListKey()) ?? [];

      const nextFlag = !!vars.toVote;
      const nextList = vars.toVote
        ? Array.from(new Set([...prevList, String(discussionId)]))
        : prevList.filter((id) => String(id) !== String(discussionId));

      qc.setQueryData(discussionHasVotedKey(discussionId), nextFlag);
      qc.setQueryData(myVotedListKey(), nextList);

      return { prevFlag, prevList } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      qc.setQueryData(discussionHasVotedKey(discussionId), ctx.prevFlag);
      qc.setQueryData(myVotedListKey(), ctx.prevList);
    },
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: discussionHasVotedKey(discussionId) }),
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


