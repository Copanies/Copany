import { NextRequest, NextResponse } from "next/server";
import { generateContributionsFromIssuesAction } from "@/actions/contribution.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const copanyId = searchParams.get("copanyId");
    
    if (!copanyId) {
      return NextResponse.json({ error: "copanyId required" }, { status: 400 });
    }
    
    const contributions = await generateContributionsFromIssuesAction(copanyId);
    return NextResponse.json({ contributions });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
