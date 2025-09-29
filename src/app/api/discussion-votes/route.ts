import { NextRequest, NextResponse } from "next/server";
import { 
  getDiscussionVoteCountAction, 
  hasVotedDiscussionAction, 
  listMyVotedDiscussionIdsAction,
  getDiscussionVoteCountsAction 
} from "@/actions/discussionVote.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const discussionId = searchParams.get("discussionId");
    const discussionIds = searchParams.getAll("discussionIds");
    const type = searchParams.get("type"); // "count", "hasVoted", "myVotedList", "counts"
    
    if (type === "count") {
      if (!discussionId) {
        return NextResponse.json({ error: "discussionId required for count" }, { status: 400 });
      }
      const count = await getDiscussionVoteCountAction(discussionId);
      return NextResponse.json({ count });
    } else if (type === "hasVoted") {
      if (!discussionId) {
        return NextResponse.json({ error: "discussionId required for hasVoted" }, { status: 400 });
      }
      const hasVoted = await hasVotedDiscussionAction(discussionId);
      return NextResponse.json({ hasVoted });
    } else if (type === "myVotedList") {
      const ids = await listMyVotedDiscussionIdsAction();
      return NextResponse.json({ ids });
    } else if (type === "counts") {
      if (!discussionIds || discussionIds.length === 0) {
        return NextResponse.json({ error: "discussionIds required for counts" }, { status: 400 });
      }
      const counts = await getDiscussionVoteCountsAction(discussionIds);
      return NextResponse.json({ counts });
    } else {
      return NextResponse.json({ error: "type required (count, hasVoted, myVotedList, counts)" }, { status: 400 });
    }
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
