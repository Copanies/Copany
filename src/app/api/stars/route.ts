import { NextRequest, NextResponse } from "next/server";
import { 
  hasStarredAction, 
  listMyStarredCopanyIdsAction 
} from "@/actions/star.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const copanyId = searchParams.get("copanyId");
    const type = searchParams.get("type"); // "hasStarred", "myStarredList"
    
    if (type === "hasStarred") {
      if (!copanyId) {
        return NextResponse.json({ error: "copanyId required for hasStarred" }, { status: 400 });
      }
      const hasStarred = await hasStarredAction(copanyId);
      return NextResponse.json({ hasStarred });
    } else if (type === "myStarredList") {
      const ids = await listMyStarredCopanyIdsAction();
      return NextResponse.json({ ids });
    } else {
      return NextResponse.json({ error: "type required (hasStarred, myStarredList)" }, { status: 400 });
    }
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
