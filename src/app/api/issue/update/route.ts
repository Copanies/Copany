import { NextRequest, NextResponse } from "next/server";
import { updateIssueAction } from "@/actions/issue.actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const data = JSON.parse(body);

    const { id, title, description, state } = data;

    if (!id || title === undefined || description === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 调用现有的 issue 更新 action
    const updatedIssue = await updateIssueAction({
      id,
      title,
      description,
      state: state ?? 0,
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
