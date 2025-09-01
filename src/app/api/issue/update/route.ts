import { NextRequest, NextResponse } from "next/server";
import { updateIssueTitleAndDescriptionAction } from "@/actions/issue.actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const data = JSON.parse(body);

    const { id, title, description, version, baseTitle, baseDescription } = data;

    if (!id || title === undefined || description === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Call existing issue update action
    try {
      const updatedIssue = await updateIssueTitleAndDescriptionAction(
        id,
        title,
        description,
        version,
        baseTitle,
        baseDescription
      );
      return NextResponse.json({ success: true, issue: updatedIssue });
    } catch (err: any) {
      if (err && err.message === "VERSION_CONFLICT") {
        return NextResponse.json(err.payload ?? { error: "Version conflict" }, { status: 409 });
      }
      throw err;
    }
  } catch (error) {
    console.error("Error updating issue via sendBeacon:", error);
    return NextResponse.json(
      { error: "Failed to update issue" },
      { status: 500 }
    );
  }
}
