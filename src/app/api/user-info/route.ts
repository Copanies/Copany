import { NextRequest, NextResponse } from "next/server";
import { getUserByIdAction, getUsersByIdsAction } from "@/actions/user.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const ids = searchParams.getAll("ids");
    if (id) {
      const info = await getUserByIdAction(id);
      return NextResponse.json({ item: info });
    }
    if (ids && ids.length > 0) {
      const map = await getUsersByIdsAction(ids);
      return NextResponse.json({ map });
    }
    return NextResponse.json({ error: "id or ids required" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}


