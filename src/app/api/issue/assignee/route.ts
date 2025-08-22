import { NextRequest, NextResponse } from "next/server";
import { updateIssueAssigneeAction } from "@/actions/issue.actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueId, assignee } = body || {};
    if (!issueId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const updated = await updateIssueAssigneeAction(issueId, assignee ?? null);
    return NextResponse.json({ issue: updated });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}


