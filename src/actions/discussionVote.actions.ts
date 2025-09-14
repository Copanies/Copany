"use server";

import { DiscussionVoteService } from "@/services/discussionVote.service";

export async function hasVotedDiscussionAction(discussionId: string) {
  return DiscussionVoteService.hasVoted(discussionId);
}

export async function listMyVotedDiscussionIdsAction() {
  return DiscussionVoteService.listMyVotedDiscussionIds();
}

export async function voteDiscussionAction(discussionId: string) {
  await DiscussionVoteService.vote(discussionId);
  return { success: true } as const;
}

export async function unvoteDiscussionAction(discussionId: string) {
  await DiscussionVoteService.unvote(discussionId);
  return { success: true } as const;
}


