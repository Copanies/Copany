import { NextRequest, NextResponse } from "next/server";
import { getDistributesAction, getTransactionsAction } from "@/actions/finance.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const copanyId = searchParams.get("copanyId");
    const type = searchParams.get("type"); // "distributes" or "transactions"
    
    if (!copanyId) {
      return NextResponse.json({ error: "copanyId required" }, { status: 400 });
    }
    
    if (!type) {
      return NextResponse.json({ error: "type required (distributes or transactions)" }, { status: 400 });
    }
    
    if (type === "distributes") {
      const distributes = await getDistributesAction(copanyId);
      return NextResponse.json({ distributes });
    } else if (type === "transactions") {
      const transactions = await getTransactionsAction(copanyId);
      return NextResponse.json({ transactions });
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
