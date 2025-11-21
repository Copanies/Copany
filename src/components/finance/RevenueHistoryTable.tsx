"use client";

import { useMemo, useState, useEffect } from "react";
import { useTransactions, useAppStoreFinance } from "@/hooks/finance";
import { convertTransactionsToMonthlyRevenueData } from "@/utils/finance";
import type { MonthlyRevenueData } from "@/utils/finance";
import { getMonthlyPeriodSimple } from "@/utils/time";
import LoadingView from "@/components/commons/LoadingView";

interface RevenueHistoryTableProps {
  copanyId: string;
}

export default function RevenueHistoryTable({
  copanyId,
}: RevenueHistoryTableProps) {
  const { data: transactions = [] } = useTransactions(copanyId);
  const { data: appStoreFinanceData } = useAppStoreFinance(copanyId);

  // Convert App Store finance data to transactions format (similar to FinanceOverviewChart)
  const appStoreTransactions = useMemo(() => {
    if (
      !copanyId ||
      !appStoreFinanceData?.chartData ||
      appStoreFinanceData.chartData.length === 0
    ) {
      return [];
    }

    return appStoreFinanceData.chartData
      .map((item) => {
        // Convert YYYY-MM to month end ISO string
        const [yearStr, monthStr] = item.date.split("-");
        const year = Number(yearStr);
        const month = Number(monthStr);
        if (!Number.isFinite(year) || !Number.isFinite(month)) {
          return null;
        }
        const occurredAt = new Date(
          Date.UTC(year, month, 0, 0, 0, 0)
        ).toISOString();
        const normalizedAmount =
          typeof item.amountUSD === "number" && Number.isFinite(item.amountUSD)
            ? item.amountUSD
            : 0;

        return {
          id: `app-store-${copanyId}-${item.date}`,
          created_at: occurredAt,
          updated_at: occurredAt,
          copany_id: copanyId,
          actor_id: "__app_store__",
          type: "income" as const,
          description:
            "Automatically synced via App Store Connect API. The actual received amount may differ due to bank transfer fees and exchange rate differences.",
          amount: normalizedAmount,
          currency: "USD",
          status: "confirmed" as const,
          occurred_at: occurredAt,
          evidence_url: null,
        };
      })
      .filter((tx): tx is NonNullable<typeof tx> => tx !== null);
  }, [appStoreFinanceData?.chartData, copanyId]);

  // Combine regular transactions with App Store transactions
  const combinedTransactions = useMemo(() => {
    return [...(transactions ?? []), ...appStoreTransactions];
  }, [transactions, appStoreTransactions]);

  // Convert transactions to monthly revenue data format
  const [revenueData, setRevenueData] = useState<MonthlyRevenueData[]>([]);
  const [isConvertingData, setIsConvertingData] = useState(false);

  useEffect(() => {
    if (!combinedTransactions || combinedTransactions.length === 0) {
      setRevenueData([]);
      return;
    }

    setIsConvertingData(true);
    convertTransactionsToMonthlyRevenueData(combinedTransactions)
      .then((data) => {
        setRevenueData(data);
        setIsConvertingData(false);
      })
      .catch((error) => {
        console.error(
          "[RevenueHistoryTable] Failed to convert transactions:",
          error
        );
        setRevenueData([]);
        setIsConvertingData(false);
      });
  }, [combinedTransactions]);

  // Sort revenue data by date in descending order (newest first)
  const sortedRevenueData = useMemo(() => {
    return [...revenueData].sort((a, b) => b.date.localeCompare(a.date));
  }, [revenueData]);

  // Format currency amount
  const formatCurrency = (amount: number): string => {
    const sign = amount < 0 ? "-" : "";
    return `${sign}$${Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Format month date (YYYY-MM) to formatted month string (e.g., "Jan 2024")
  const formatMonthDate = (dateStr: string): string => {
    // Convert YYYY-MM to Date for getMonthlyPeriodSimple
    const [year, month] = dateStr.split("-");
    if (!year || !month) return dateStr;
    const date = new Date(Number(year), Number(month) - 1, 1);
    return getMonthlyPeriodSimple(date);
  };

  if (isConvertingData) {
    return <LoadingView type="label" label="Converting currency data..." />;
  }

  if (revenueData.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="font-medium bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Month</th>
                <th className="px-4 py-3 text-right">Income</th>
                <th className="px-4 py-3 text-right">Expense</th>
                <th className="px-4 py-3 text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {sortedRevenueData.map((month) => (
                <tr
                  key={month.date}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3 font-medium">
                    {formatMonthDate(month.date)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(month.incomeUSD)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(month.expenseUSD)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCurrency(month.netProfitUSD)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
