import { NextRequest, NextResponse } from "next/server";
import { listAssignmentRequestsAction } from "@/actions/assignmentRequest.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issueId");
    if (!issueId) return NextResponse.json({ error: "issueId required" }, { status: 400 });
    const list = await listAssignmentRequestsAction(issueId);
    return NextResponse.json({ items: list });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}


