import { NextRequest, NextResponse } from "next/server";
import { listAllDiscussionsAction } from "@/actions/discussion.actions";

export async function GET(_request: NextRequest) {
  try {
    const discussions = await listAllDiscussionsAction();
    return NextResponse.json({ discussions });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
