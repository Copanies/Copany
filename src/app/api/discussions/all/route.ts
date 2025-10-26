import { NextRequest, NextResponse } from "next/server";
import { listAllDiscussionsAction } from "@/actions/discussion.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");
    
    const pageNumber = page ? parseInt(page, 10) : 1;
    const result = await listAllDiscussionsAction(pageNumber);
    return NextResponse.json(result);
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
