import { createAdminSupabaseClient, createSupabaseClient } from "@/utils/supabase/server";

export interface FinanceReportData {
  reportType: string;
  regionCode: string;
  reportDate: string;
  rawData?: string;
  parsedData?: {
    headers: string[];
    rows: string[][];
  };
  filteredData?: {
    headers: string[];
    rows: string[][];
  };
}

export interface FinanceChartData {
  date: string; // YYYY-MM format
  amountUSD: number;
  count: number;
  transactions: Array<{
    date: string; // YYYY-MM format for grouping
    transactionDate: string; // MM/DD/YYYY format for display
    amount: number;
    currency: string;
    amountUSD: number;
    type: string;
  }>;
}

export class AppStoreFinanceDataService {
  /**
   * Delete all finance data for a copany
   * @param copanyId - Copany ID
   */
  static async deleteFinanceData(copanyId: string): Promise<void> {
    const adminSupabase = await createAdminSupabaseClient();

    // Delete chart data
    const { error: chartError } = await adminSupabase
      .from("app_store_finance_chart_data")
      .delete()
      .eq("copany_id", copanyId);

    if (chartError) {
      console.error("Error deleting chart data:", chartError);
      throw new Error(`Failed to delete chart data: ${chartError.message}`);
    }

    // Delete report data
    const { error: reportError } = await adminSupabase
      .from("app_store_finance_data")
      .delete()
      .eq("copany_id", copanyId);

    if (reportError) {
      console.error("Error deleting report data:", reportError);
      throw new Error(`Failed to delete report data: ${reportError.message}`);
    }
  }

  /**
   * Save finance reports data
   * @param copanyId - Copany ID
   * @param reports - Array of finance report data
   */
  static async saveFinanceReports(
    copanyId: string,
    reports: FinanceReportData[]
  ): Promise<void> {
    const adminSupabase = await createAdminSupabaseClient();

    if (reports.length === 0) {
      return;
    }

    // Prepare data for insertion
    const reportRows = reports.map((report) => ({
      copany_id: parseInt(copanyId),
      report_type: report.reportType,
      region_code: report.regionCode,
      report_date: report.reportDate,
      raw_data: report.rawData || null,
      parsed_data: report.parsedData || null,
      filtered_data: report.filteredData || null,
    }));

    const { error } = await adminSupabase
      .from("app_store_finance_data")
      .insert(reportRows);

    if (error) {
      console.error("Error saving finance reports:", error);
      throw new Error(`Failed to save finance reports: ${error.message}`);
    }
  }

  /**
   * Save finance chart data
   * @param copanyId - Copany ID
   * @param chartData - Array of chart data
   */
  static async saveFinanceChartData(
    copanyId: string,
    chartData: FinanceChartData[]
  ): Promise<void> {
    const adminSupabase = await createAdminSupabaseClient();

    if (chartData.length === 0) {
      return;
    }

    // Prepare data for insertion
    const chartRows = chartData.map((item) => ({
      copany_id: parseInt(copanyId),
      date: item.date,
      amount_usd: item.amountUSD,
      transaction_count: item.count,
      transactions: item.transactions,
    }));

    // Use upsert to handle duplicates (based on unique constraint copany_id + date)
    const { error } = await adminSupabase
      .from("app_store_finance_chart_data")
      .upsert(chartRows, {
        onConflict: "copany_id,date",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("Error saving chart data:", error);
      throw new Error(`Failed to save chart data: ${error.message}`);
    }
  }

  /**
   * Save all finance data (reports and chart data)
   * This will delete old data first, then save new data
   * @param copanyId - Copany ID
   * @param reports - Array of finance report data
   * @param chartData - Array of chart data
   */
  static async saveFinanceData(
    copanyId: string,
    reports: FinanceReportData[],
    chartData: FinanceChartData[]
  ): Promise<void> {
    // Delete old data first
    await this.deleteFinanceData(copanyId);

    // Save new data
    await this.saveFinanceReports(copanyId, reports);
    await this.saveFinanceChartData(copanyId, chartData);
  }

  /**
   * Get finance reports for a copany
   * @param copanyId - Copany ID
   * @returns Array of finance report data
   */
  static async getFinanceReports(
    copanyId: string
  ): Promise<FinanceReportData[]> {
    // Use regular client to respect RLS policies (allows public read)
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from("app_store_finance_data")
      .select("*")
      .eq("copany_id", copanyId)
      .order("report_date", { ascending: false });

    if (error) {
      console.error("Error getting finance reports:", error);
      throw new Error(`Failed to get finance reports: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data.map((row) => ({
      reportType: row.report_type,
      regionCode: row.region_code,
      reportDate: row.report_date,
      rawData: row.raw_data || undefined,
      parsedData: row.parsed_data || undefined,
      filteredData: row.filtered_data || undefined,
    }));
  }

  /**
   * Get finance chart data for a copany
   * @param copanyId - Copany ID
   * @returns Array of chart data
   */
  static async getFinanceChartData(
    copanyId: string
  ): Promise<FinanceChartData[]> {
    // Use regular client to respect RLS policies (allows public read)
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from("app_store_finance_chart_data")
      .select("*")
      .eq("copany_id", copanyId)
      .order("date", { ascending: true });

    if (error) {
      console.error("Error getting chart data:", error);
      throw new Error(`Failed to get chart data: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data.map((row) => ({
      date: row.date,
      amountUSD: parseFloat(row.amount_usd.toString()),
      count: row.transaction_count,
      transactions: row.transactions || [],
    }));
  }
}

