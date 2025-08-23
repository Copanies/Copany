import { NextRequest, NextResponse } from "next/server";
import { updateIssuePriorityAction } from "@/actions/issue.actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueId, priority } = body || {};
    if (!issueId || priority === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const updated = await updateIssuePriorityAction(issueId, priority);
    return NextResponse.json({ issue: updated });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}


