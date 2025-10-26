import { NextRequest, NextResponse } from "next/server";
import { listDiscussionsAction } from "@/actions/discussion.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const copanyId = searchParams.get("copanyId");
    const page = searchParams.get("page");
    
    if (!copanyId) {
      return NextResponse.json({ error: "copanyId required" }, { status: 400 });
    }
    
    const pageNumber = page ? parseInt(page, 10) : 1;
    const result = await listDiscussionsAction(copanyId, pageNumber);
    return NextResponse.json(result);
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
