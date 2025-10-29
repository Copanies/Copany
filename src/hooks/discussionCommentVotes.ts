import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMyVotedDiscussionCommentIdsAction,
  voteDiscussionCommentAction,
  unvoteDiscussionCommentAction,
  getDiscussionCommentVoteCountsAction,
} from "@/actions/discussionCommentVote.actions";
import { useCurrentUser } from "./currentUser";

export function discussionCommentHasVotedKey(commentId: string, userId: string) {
  return ["discussionCommentVote", "hasVoted", commentId, userId];
}

function myVotedCommentListKey(userId: string) {
  return ["discussionCommentVote", "myVotedList", userId];
}

function discussionCommentVoteCountKey(commentId: string) {
  return ["discussionCommentVote", "count", commentId];
}

export function useToggleDiscussionCommentVote(commentId: string) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id || "anonymous";

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
          queryKey: discussionCommentHasVotedKey(commentId, userId),
        }),
        queryClient.cancelQueries({
          queryKey: discussionCommentVoteCountKey(commentId),
        }),
        queryClient.cancelQueries({
          queryKey: myVotedCommentListKey(userId),
        }),
      ]);

      // Snapshot previous values
      const previousHasVoted = queryClient.getQueryData(
        discussionCommentHasVotedKey(commentId, userId)
      ) as boolean | undefined;
      const previousCount = queryClient.getQueryData(
        discussionCommentVoteCountKey(commentId)
      ) as number | undefined;
      const previousList = queryClient.getQueryData(myVotedCommentListKey(userId)) as string[] | undefined;

      // Optimistically update
      const nextFlag = !!toVote;
      const nextCount = toVote ? (previousCount || 0) + 1 : Math.max(0, (previousCount || 0) - 1);
      const nextList = toVote
        ? Array.from(new Set([...(previousList || []), String(commentId)]))
        : (previousList || []).filter((id) => String(id) !== String(commentId));

      queryClient.setQueryData(discussionCommentHasVotedKey(commentId, userId), nextFlag);
      queryClient.setQueryData(discussionCommentVoteCountKey(commentId), nextCount);
      queryClient.setQueryData(myVotedCommentListKey(userId), nextList);

      return { previousHasVoted, previousCount, previousList };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context) {
        queryClient.setQueryData(
          discussionCommentHasVotedKey(commentId, userId),
          context.previousHasVoted
        );
        queryClient.setQueryData(
          discussionCommentVoteCountKey(commentId),
          context.previousCount
        );
        queryClient.setQueryData(
          myVotedCommentListKey(userId),
          context.previousList
        );
      }
    },
    onSettled: async () => {
      // Always refetch after success or error
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: discussionCommentHasVotedKey(commentId, userId),
        }),
        queryClient.invalidateQueries({
          queryKey: discussionCommentVoteCountKey(commentId),
        }),
        queryClient.invalidateQueries({
          queryKey: myVotedCommentListKey(userId),
        }),
      ]);
    },
  });
}

export function useMyVotedDiscussionCommentIds() {
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id || "anonymous";
  
  return useQuery({
    queryKey: myVotedCommentListKey(userId),
    queryFn: listMyVotedDiscussionCommentIdsAction,
    enabled: !!currentUser,
    staleTime: 1 * 10 * 1000,
  });
}

function discussionCommentVoteCountsKey(commentIds: string[]) {
  return ["discussionCommentVote", "counts", commentIds.sort()];
}

export function useDiscussionCommentVoteCounts(commentIds: string[]) {
  return useQuery({
    queryKey: discussionCommentVoteCountsKey(commentIds),
    queryFn: async () => {
      try {
        const params = commentIds.map(id => `commentIds=${encodeURIComponent(id)}`).join('&');
        const res = await fetch(`/api/discussion-comment-votes?${params}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.counts;
      } catch {
        return await getDiscussionCommentVoteCountsAction(commentIds);
      }
    },
    staleTime: 1 * 10 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    enabled: commentIds.length > 0,
  });
}
