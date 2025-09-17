import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  hasVotedDiscussionCommentAction,
  listMyVotedDiscussionCommentIdsAction,
  voteDiscussionCommentAction,
  unvoteDiscussionCommentAction,
  getDiscussionCommentVoteCountAction,
} from "@/actions/discussionCommentVote.actions";

export function discussionCommentHasVotedKey(commentId: string) {
  return ["discussionCommentVote", "hasVoted", commentId];
}

function myVotedCommentListKey() {
  return ["discussionCommentVote", "myVotedList"];
}

function discussionCommentVoteCountKey(commentId: string) {
  return ["discussionCommentVote", "count", commentId];
}

export function useDiscussionCommentVoteState(
  commentId: string,
  options?: { countInitialData?: number; enableCountQuery?: boolean }
) {
  const enableCountQuery = options?.enableCountQuery ?? true;
  const countQuery = useQuery({
    queryKey: discussionCommentVoteCountKey(commentId),
    queryFn: () => getDiscussionCommentVoteCountAction(commentId),
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    enabled: enableCountQuery,
    initialData: options?.countInitialData,
  });
  const flagQuery = useQuery({
    queryKey: discussionCommentHasVotedKey(commentId),
    queryFn: () => hasVotedDiscussionCommentAction(commentId),
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
  return { countQuery, flagQuery } as const;
}

export function useToggleDiscussionCommentVote(commentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ toVote }: { toVote: boolean }) => {
      if (toVote) {
        await voteDiscussionCommentAction(commentId);
      } else {
        await unvoteDiscussionCommentAction(commentId);
      }
    },
    onMutate: async ({ toVote }) => {
      // Cancel outgoing refetches
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: discussionCommentHasVotedKey(commentId),
        }),
        queryClient.cancelQueries({
          queryKey: discussionCommentVoteCountKey(commentId),
        }),
        queryClient.cancelQueries({
          queryKey: myVotedCommentListKey(),
        }),
      ]);

      // Snapshot previous values
      const previousHasVoted = queryClient.getQueryData(
        discussionCommentHasVotedKey(commentId)
      ) as boolean | undefined;
      const previousCount = queryClient.getQueryData(
        discussionCommentVoteCountKey(commentId)
      ) as number | undefined;
      const previousList = queryClient.getQueryData(myVotedCommentListKey()) as string[] | undefined;

      // Optimistically update
      const nextFlag = !!toVote;
      const nextCount = toVote ? (previousCount || 0) + 1 : Math.max(0, (previousCount || 0) - 1);
      const nextList = toVote
        ? Array.from(new Set([...(previousList || []), String(commentId)]))
        : (previousList || []).filter((id) => String(id) !== String(commentId));

      queryClient.setQueryData(discussionCommentHasVotedKey(commentId), nextFlag);
      queryClient.setQueryData(discussionCommentVoteCountKey(commentId), nextCount);
      queryClient.setQueryData(myVotedCommentListKey(), nextList);

      return { previousHasVoted, previousCount, previousList };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context) {
        queryClient.setQueryData(
          discussionCommentHasVotedKey(commentId),
          context.previousHasVoted
        );
        queryClient.setQueryData(
          discussionCommentVoteCountKey(commentId),
          context.previousCount
        );
        queryClient.setQueryData(
          myVotedCommentListKey(),
          context.previousList
        );
      }
    },
    onSettled: async () => {
      // Always refetch after success or error
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: discussionCommentHasVotedKey(commentId),
        }),
        queryClient.invalidateQueries({
          queryKey: discussionCommentVoteCountKey(commentId),
        }),
        queryClient.invalidateQueries({
          queryKey: myVotedCommentListKey(),
        }),
      ]);
    },
  });
}

export function useMyVotedDiscussionCommentIds() {
  return useQuery({
    queryKey: myVotedCommentListKey(),
    queryFn: listMyVotedDiscussionCommentIdsAction,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
