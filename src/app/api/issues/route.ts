import { NextRequest, NextResponse } from "next/server";
import { getIssuesAction } from "@/actions/issue.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const copanyId = searchParams.get("copanyId");
    if (!copanyId) return NextResponse.json({ error: "copanyId required" }, { status: 400 });
    const list = await getIssuesAction(copanyId);
    return NextResponse.json({ issues: list });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}


