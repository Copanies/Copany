import { NextRequest, NextResponse } from "next/server";
import { 
  getCopanyByIdAction, 
  getCopaniesAction, 
  getCopaniesWhereUserIsContributorAction,
  getCopaniesByIdsAction
} from "@/actions/copany.actions";
import { listMyStarredCopanyIdsAction } from "@/actions/star.actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const type = searchParams.get("type"); // "single", "list", "userContributor", "starred", "byIds"
    
    if (type === "single") {
      if (!id) {
        return NextResponse.json({ error: "id required for single copany" }, { status: 400 });
      }
      const copany = await getCopanyByIdAction(id);
      return NextResponse.json({ copany });
    } else if (type === "list") {
      const page = searchParams.get("page");
      const pageNumber = page ? parseInt(page, 10) : 1;
      const result = await getCopaniesAction(pageNumber);
      return NextResponse.json(result);
    } else if (type === "userContributor") {
      if (!userId || userId.trim() === "") {
        return NextResponse.json({ copanies: [] });
      }
      const copanies = await getCopaniesWhereUserIsContributorAction(userId);
      return NextResponse.json({ copanies });
    } else if (type === "starred") {
      const ids = await listMyStarredCopanyIdsAction();
      return NextResponse.json({ ids });
    } else if (type === "byIds") {
      const ids = searchParams.getAll("ids");
      if (ids.length === 0) {
        return NextResponse.json({ error: "ids required for byIds" }, { status: 400 });
      }
      const map = await getCopaniesByIdsAction(ids);
      return NextResponse.json({ map });
    } else {
      return NextResponse.json({ error: "type required (single, list, userContributor, starred, byIds)" }, { status: 400 });
    }
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
