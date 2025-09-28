import { NextRequest, NextResponse } from "next/server";
import { getDiscussionCommentsAction } from "@/actions/discussionComment.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const discussionId = searchParams.get("discussionId");
    
    if (!discussionId) {
      return NextResponse.json({ error: "discussionId required" }, { status: 400 });
    }
    
    const comments = await getDiscussionCommentsAction(discussionId);
    return NextResponse.json({ comments });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
