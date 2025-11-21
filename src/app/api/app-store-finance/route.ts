import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/utils/supabase/server";
import { AppStoreFinanceDataService } from "@/services/appStoreFinanceData.service";

/**
 * GET /api/app-store-finance
 * Get App Store Connect finance data for a copany
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const copanyId = searchParams.get("copanyId");

    if (!copanyId) {
      return NextResponse.json(
        { error: "copanyId is required" },
        { status: 400 }
      );
    }

    // Verify user authentication (optional, but good practice)
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get finance data (RLS allows public read)
    const reports = await AppStoreFinanceDataService.getFinanceReports(copanyId);
    const chartData = await AppStoreFinanceDataService.getFinanceChartData(copanyId);

    return NextResponse.json({
      reports,
      chartData,
    });
  } catch (error) {
    console.error("GET /api/app-store-finance error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch finance data",
      },
      { status: 500 }
    );
  }
}

