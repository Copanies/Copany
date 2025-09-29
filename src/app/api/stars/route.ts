import { NextRequest, NextResponse } from "next/server";
import { 
  getStarCountAction, 
  hasStarredAction, 
  listMyStarredCopanyIdsAction 
} from "@/actions/star.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const copanyId = searchParams.get("copanyId");
    const type = searchParams.get("type"); // "count", "hasStarred", "myStarredList"
    
    if (type === "count") {
      if (!copanyId) {
        return NextResponse.json({ error: "copanyId required for count" }, { status: 400 });
      }
      const count = await getStarCountAction(copanyId);
      return NextResponse.json({ count });
    } else if (type === "hasStarred") {
      if (!copanyId) {
        return NextResponse.json({ error: "copanyId required for hasStarred" }, { status: 400 });
      }
      const hasStarred = await hasStarredAction(copanyId);
      return NextResponse.json({ hasStarred });
    } else if (type === "myStarredList") {
      const ids = await listMyStarredCopanyIdsAction();
      return NextResponse.json({ ids });
    } else {
      return NextResponse.json({ error: "type required (count, hasStarred, myStarredList)" }, { status: 400 });
    }
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
