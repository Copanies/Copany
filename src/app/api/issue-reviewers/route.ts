import { NextRequest, NextResponse } from "next/server";
import { listIssueReviewersAction } from "@/actions/issueReviewer.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issueId");
    if (!issueId) return NextResponse.json({ error: "issueId required" }, { status: 400 });
    const items = await listIssueReviewersAction(issueId);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}


