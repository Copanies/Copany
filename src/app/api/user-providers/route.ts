import { NextRequest, NextResponse } from "next/server";
import { getUserProvidersAction } from "@/actions/user.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    
    const providers = await getUserProvidersAction(userId);
    return NextResponse.json({ providers });
  } catch (error) {
    console.error("Error fetching user providers:", error);
    return NextResponse.json({ error: "Failed to fetch user providers" }, { status: 500 });
  }
}

