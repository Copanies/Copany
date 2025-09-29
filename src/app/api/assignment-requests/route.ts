import { NextRequest, NextResponse } from "next/server";
import { 
  listAssignmentRequestsAction, 
  listAssignmentRequestsByCopanyAction 
} from "@/actions/assignmentRequest.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issueId");
    const copanyId = searchParams.get("copanyId");
    const type = searchParams.get("type"); // "byIssue" or "byCopany"
    
    if (type === "byIssue") {
      if (!issueId) {
        return NextResponse.json({ error: "issueId required for byIssue" }, { status: 400 });
      }
      const items = await listAssignmentRequestsAction(issueId);
      return NextResponse.json({ items });
    } else if (type === "byCopany") {
      if (!copanyId) {
        return NextResponse.json({ error: "copanyId required for byCopany" }, { status: 400 });
      }
      const items = await listAssignmentRequestsByCopanyAction(copanyId);
      return NextResponse.json({ items });
    } else {
      return NextResponse.json({ error: "type required (byIssue or byCopany)" }, { status: 400 });
    }
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}