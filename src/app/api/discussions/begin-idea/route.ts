import { NextRequest, NextResponse } from "next/server";
import { getBeginIdeaDiscussionAction } from "@/actions/discussion.actions";

/**
 * GET /api/discussions/begin-idea?copanyId=xxx
 * Returns the "Begin idea" discussion for a copany. Public endpoint (no auth required).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const copanyId = searchParams.get("copanyId");

    if (!copanyId) {
      return NextResponse.json(
        { error: "copanyId required" },
        { status: 400 }
      );
    }

    const result = await getBeginIdeaDiscussionAction(copanyId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to load Begin idea discussion" },
        { status: 500 }
      );
    }

    return NextResponse.json(result.discussion ?? null);
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
