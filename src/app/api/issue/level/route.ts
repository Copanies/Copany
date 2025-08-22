import { NextRequest, NextResponse } from "next/server";
import { updateIssueLevelAction } from "@/actions/issue.actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueId, level } = body || {};
    if (!issueId || level === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const updated = await updateIssueLevelAction(issueId, level);
    return NextResponse.json({ issue: updated });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}


