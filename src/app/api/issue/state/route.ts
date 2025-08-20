import { NextRequest, NextResponse } from "next/server";
import { updateIssueStateAction } from "@/actions/issue.actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueId, state } = body || {};
    if (!issueId || state === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const updated = await updateIssueStateAction(issueId, state);
    return NextResponse.json({ issue: updated });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}


