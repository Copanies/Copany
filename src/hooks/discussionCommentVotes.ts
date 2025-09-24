import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMyVotedDiscussionCommentIdsAction,
  voteDiscussionCommentAction,
  unvoteDiscussionCommentAction,
  getDiscussionCommentVoteCountsAction,
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

function discussionCommentVoteCountsKey(commentIds: string[]) {
  return ["discussionCommentVote", "counts", commentIds.sort()];
}

export function useDiscussionCommentVoteCounts(commentIds: string[]) {
  return useQuery({
    queryKey: discussionCommentVoteCountsKey(commentIds),
    queryFn: () => getDiscussionCommentVoteCountsAction(commentIds),
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    enabled: commentIds.length > 0,
  });
}
