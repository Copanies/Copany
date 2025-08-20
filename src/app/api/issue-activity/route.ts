import { NextRequest, NextResponse } from "next/server";
import { listIssueActivityAction } from "@/actions/issueActivity.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issueId");
    const limitStr = searchParams.get("limit");
    if (!issueId) return NextResponse.json({ error: "issueId required" }, { status: 400 });
    const limit = limitStr ? Number(limitStr) : 200;
    const items = await listIssueActivityAction(issueId, limit);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}


