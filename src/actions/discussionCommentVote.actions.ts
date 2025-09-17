"use server";

import { DiscussionCommentVoteService } from "@/services/discussionCommentVote.service";

export async function hasVotedDiscussionCommentAction(commentId: string) {
  return await DiscussionCommentVoteService.hasVoted(commentId);
}

export async function listMyVotedDiscussionCommentIdsAction() {
  return await DiscussionCommentVoteService.listMyVotedCommentIds();
}

export async function voteDiscussionCommentAction(commentId: string) {
  await DiscussionCommentVoteService.vote(commentId);
  return { success: true };
}

export async function unvoteDiscussionCommentAction(commentId: string) {
  await DiscussionCommentVoteService.unvote(commentId);
  return { success: true };
}

export async function getDiscussionCommentVoteCountAction(commentId: string): Promise<number> {
  return await DiscussionCommentVoteService.getVoteCount(commentId);
}
