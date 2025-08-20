import { NextRequest, NextResponse } from "next/server";
import { getCopanyContributorsAction } from "@/actions/copanyContributor.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const copanyId = searchParams.get("copanyId");
    if (!copanyId) return NextResponse.json({ error: "copanyId required" }, { status: 400 });
    const contributors = await getCopanyContributorsAction(copanyId);
    return NextResponse.json({ contributors });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}


