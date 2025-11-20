"use client";

import { useMemo, useState, useEffect } from "react";
import { useTransactions, useAppStoreFinance } from "@/hooks/finance";
import { convertTransactionsToChartData } from "@/utils/finance";
import type { ChartDataPoint } from "@/utils/finance";
import FinanceChartView from "./FinanceChartView";
import LoadingView from "@/components/commons/LoadingView";

interface FinanceOverviewChartProps {
  copanyId: string;
  size?: "small" | "large";
  showLatestRevenue?: boolean;
  showAvgMonthlyRevenue?: boolean;
  showOneYearRevenue?: boolean;
  showAllRevenue?: boolean;
}

export default function FinanceOverviewChart({
  copanyId,
  size = "large",
  showLatestRevenue = true,
  showAvgMonthlyRevenue = true,
  showOneYearRevenue = true,
  showAllRevenue = true,
}: FinanceOverviewChartProps) {
  const { data: transactions = [] } = useTransactions(copanyId);
  const { data: appStoreFinanceData } = useAppStoreFinance(copanyId);

  // Convert App Store finance data to transactions format (similar to FinanceView)
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

  // Convert transactions to chart data format
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isConvertingData, setIsConvertingData] = useState(false);

  useEffect(() => {
    if (!combinedTransactions || combinedTransactions.length === 0) {
      setChartData([]);
      return;
    }

    setIsConvertingData(true);
    convertTransactionsToChartData(combinedTransactions)
      .then((data) => {
        setChartData(data);
        setIsConvertingData(false);
      })
      .catch((error) => {
        console.error(
          "[FinanceOverviewChart] Failed to convert transactions:",
          error
        );
        setChartData([]);
        setIsConvertingData(false);
      });
  }, [combinedTransactions]);
  // Calculate statistics from chart data
  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return {
        latestRevenue: 0,
        avgMonthlyRevenue: 0,
        oneYearRevenue: 0,
        allRevenue: 0,
      };
    }

    // Latest Revenue: most recent month's net income
    const latestRevenue = chartData[chartData.length - 1]?.amountUSD || 0;

    // Avg Monthly Revenue: average of all months
    const avgMonthlyRevenue =
      chartData.reduce((sum, item) => sum + item.amountUSD, 0) /
      chartData.length;

    // One Year Revenue: sum of last 12 months (or all if less than 12)
    const oneYearData = chartData.slice(-12);
    const oneYearRevenue = oneYearData.reduce(
      (sum, item) => sum + item.amountUSD,
      0
    );

    // All Revenue: sum of all months
    const allRevenue = chartData.reduce((sum, item) => sum + item.amountUSD, 0);

    return {
      latestRevenue,
      avgMonthlyRevenue,
      oneYearRevenue,
      allRevenue,
    };
  }, [chartData]);

  const hasAnyStats =
    showLatestRevenue ||
    showAvgMonthlyRevenue ||
    showOneYearRevenue ||
    showAllRevenue;

  const hasNoData = chartData.length === 0;

  if (isConvertingData) {
    return <LoadingView type="label" label="Converting currency data..." />;
  }

  return (
    <div className="w-full space-y-4">
      {/* Statistics Section - Show even when no data */}
      {hasAnyStats && (
        <div className="flex flex-col gap-2 w-full">
          {showLatestRevenue && (
            <div className="flex flex-row gap-2">
              <div className="text-sm text-gray-900 dark:text-gray-100">
                Latest Revenue
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {hasNoData ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    暂无收益
                  </span>
                ) : (
                  <>
                    {stats.latestRevenue < 0 ? "-" : ""}$
                    {Math.abs(stats.latestRevenue).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </>
                )}
              </div>
            </div>
          )}
          {showAvgMonthlyRevenue && (
            <div className="flex flex-row gap-2">
              <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-gray-100">
                {size === "small" && (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0"
                  >
                    <path
                      d="M7.63398 2.5C8.01888 1.83333 8.98112 1.83333 9.36603 2.5L14.5622 11.5C14.9471 12.1667 14.466 13 13.6962 13H3.30385C2.53405 13 2.05292 12.1667 2.43782 11.5L7.63398 2.5Z"
                      fill={hasNoData ? "#9ca3af" : "#27AE60"}
                    />
                  </svg>
                )}
                {!hasNoData && (
                  <span className="text-gray-900 dark:text-gray-100">
                    Avg Monthly Revenue
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {hasNoData ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    暂无收益
                  </span>
                ) : (
                  <>
                    {stats.avgMonthlyRevenue < 0 ? "-" : ""}$
                    {Math.abs(stats.avgMonthlyRevenue).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          {showOneYearRevenue && (
            <div className="flex flex-row gap-2">
              <div className="text-sm text-gray-900 dark:text-gray-100">
                One Year Revenue
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {hasNoData ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    暂无收益
                  </span>
                ) : (
                  <>
                    {stats.oneYearRevenue < 0 ? "-" : ""}$
                    {Math.abs(stats.oneYearRevenue).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </>
                )}
              </div>
            </div>
          )}
          {showAllRevenue && (
            <div className="flex flex-row gap-2">
              <div className="text-sm text-gray-900 dark:text-gray-100">
                All Revenue
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {hasNoData ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    暂无收益
                  </span>
                ) : (
                  <>
                    {stats.allRevenue < 0 ? "-" : ""}$
                    {Math.abs(stats.allRevenue).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart Section - Always show chart, even when no data */}
      <FinanceChartView
        chartData={chartData}
        size={size}
        emptyMessage="No finance data available."
      />
    </div>
  );
}
