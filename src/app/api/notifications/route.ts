import { NextRequest, NextResponse } from "next/server";
import { listNotificationsAction, unreadCountAction, markReadAction, markAllReadAction } from "@/actions/notification.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before") || undefined;
    const limit = Number(searchParams.get("limit") || 20);
    const items = await listNotificationsAction(limit, before || undefined);
    const unread = await unreadCountAction();
    return NextResponse.json({ items, unread });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, all } = body || {};
    if (all) await markAllReadAction();
    else if (ids && Array.isArray(ids)) await markReadAction(ids);
    else return NextResponse.json({ error: "Missing" }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}


