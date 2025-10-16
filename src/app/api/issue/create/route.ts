import { NextRequest, NextResponse } from "next/server";
import { createIssueAction } from "@/actions/issue.actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { copany_id, title, description, state, priority, level, assignee } = body || {};
    if (!copany_id || !title) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const created = await createIssueAction({
      copany_id,
      title,
      description,
      state,
      priority,
      level,
      assignee,
      closed_at: null,
    });
    return NextResponse.json({ issue: created });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}


