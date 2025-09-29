import { NextRequest, NextResponse } from "next/server";
import { getDiscussionCommentVoteCountsAction } from "@/actions/discussionCommentVote.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentIds = searchParams.getAll("commentIds");
    
    if (!commentIds || commentIds.length === 0) {
      return NextResponse.json({ error: "commentIds required" }, { status: 400 });
    }
    
    const counts = await getDiscussionCommentVoteCountsAction(commentIds);
    return NextResponse.json({ counts });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
