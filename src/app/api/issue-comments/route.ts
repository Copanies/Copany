import { NextRequest, NextResponse } from "next/server";
import { getIssueCommentsAction, createIssueCommentAction, updateIssueCommentAction, deleteIssueCommentAction } from "@/actions/issueComment.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issueId");
    if (!issueId) return NextResponse.json({ error: "issueId required" }, { status: 400 });
    const items = await getIssueCommentsAction(issueId);
    return NextResponse.json({ items });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueId, content, parentId } = body || {};
    if (!issueId || !content) return NextResponse.json({ error: "Missing" }, { status: 400 });
    const created = await createIssueCommentAction(issueId, content, parentId);
    return NextResponse.json({ item: created });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId, content } = body || {};
    if (!commentId || !content) return NextResponse.json({ error: "Missing" }, { status: 400 });
    const updated = await updateIssueCommentAction(commentId, content);
    return NextResponse.json({ item: updated });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");
    if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });
    await deleteIssueCommentAction(commentId);
    return NextResponse.json({ success: true });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}


