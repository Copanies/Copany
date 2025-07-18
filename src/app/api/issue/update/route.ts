import { NextRequest, NextResponse } from "next/server";
import { updateIssueAction } from "@/actions/issue.actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const data = JSON.parse(body);

    const { id, title, description, state, priority, level, assignee } = data;

    if (!id || title === undefined || description === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Call existing issue update action
    const updatedIssue = await updateIssueAction({
      id,
      title,
      description,
      state: state ?? 0,
      priority: priority ?? null,
      level: level ?? null,
      assignee: assignee ?? null,
    });

    return NextResponse.json({ success: true, issue: updatedIssue });
  } catch (error) {
    console.error("Error updating issue via sendBeacon:", error);
    return NextResponse.json(
      { error: "Failed to update issue" },
      { status: 500 }
    );
  }
}
