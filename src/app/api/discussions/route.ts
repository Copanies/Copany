import { NextRequest, NextResponse } from "next/server";
import { listDiscussionsAction } from "@/actions/discussion.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const copanyId = searchParams.get("copanyId");
    
    if (!copanyId) {
      return NextResponse.json({ error: "copanyId required" }, { status: 400 });
    }
    
    const discussions = await listDiscussionsAction(copanyId);
    return NextResponse.json({ discussions });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
