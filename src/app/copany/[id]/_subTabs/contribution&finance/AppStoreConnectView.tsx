"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Button from "@/components/commons/Button";
import Modal from "@/components/commons/Modal";
import LoadingView from "@/components/commons/LoadingView";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { Group } from "@visx/group";
import { LinePath, AreaClosed } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { scaleLinear, scaleTime } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { useTooltip } from "@visx/tooltip";
import { useDarkMode } from "@/utils/useDarkMode";
import { useAppStoreFinance, useRefreshAppStoreFinance } from "@/hooks/finance";
import { getMonthlyPeriodSimple } from "@/utils/time";
import ConnectToAppStoreConnect from "@/components/finance/ConnectToAppStoreConnect";

interface Credentials {
  privateKey: string;
  keyId: string;
  issuerId: string;
  vendorNumber: string;
  appSKU: string;
}

interface FinanceReport {
  reportType: string;
  regionCode: string;
  reportDate: string;
  data: string;
  parsed?: {
    headers: string[];
    rows: string[][];
  };
  filtered?: {
    headers: string[];
    rows: string[][];
  };
}

interface FinanceReportResponse {
  success: boolean;
  reports?: FinanceReport[];
  errors?: Array<{
    reportType: string;
    regionCode: string;
    reportDate: string;
    error: string;
  }>;
  summary?: {
    total: number;
    success: number;
    failed: number;
  };
  chartData?: Array<{
    date: string;
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
  }>;
  error?: string;
}

export default function AppStoreConnectView({
  copanyId,
}: {
  copanyId: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<
    Array<{
      reportType: string;
      regionCode: string;
      reportDate: string;
      error: string;
    }>
  >([]);
  const [summary, setSummary] = useState<{
    total: number;
    success: number;
    failed: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<
    "raw" | "formatted" | "chart" | "monthly"
  >("chart");
  const [selectedReport, setSelectedReport] = useState<FinanceReport | null>(
    null
  );

  // Use React Query hook to fetch finance data from database
  const { data: financeData, isLoading: isLoadingFinanceData } =
    useAppStoreFinance(copanyId);
  const refreshFinanceData = useRefreshAppStoreFinance(copanyId);

  // Convert database data to component state format
  const reports = useMemo<FinanceReport[]>(() => {
    if (!financeData?.reports) return [];
    return financeData.reports.map((report) => ({
      reportType: report.reportType,
      regionCode: report.regionCode,
      reportDate: report.reportDate,
      data: report.rawData || "",
      parsed: report.parsedData,
      filtered: report.filteredData,
    }));
  }, [financeData?.reports]);

  const chartData = useMemo(() => {
    return financeData?.chartData || [];
  }, [financeData?.chartData]);

  const handleFetchReports = async (credentials: Credentials) => {
    console.log("[DEBUG] handleFetchReports called with credentials:", {
      keyId: credentials.keyId,
      issuerId: credentials.issuerId,
      vendorNumber: credentials.vendorNumber,
      appSKU: credentials.appSKU,
      privateKeyLength: credentials.privateKey?.length || 0,
    });

    setIsLoading(true);
    setIsModalOpen(false);
    setErrors([]);
    setSummary(null);
    setSelectedReport(null);

    try {
      console.log("[DEBUG] Sending request to /api/app-store-connect");
      const response = await fetch("/api/app-store-connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...credentials,
          copanyId,
        }),
      });

      console.log(
        "[DEBUG] Response status:",
        response.status,
        response.statusText
      );
      const data: FinanceReportResponse = await response.json();
      console.log("[DEBUG] Response data:", {
        success: data.success,
        reportsCount: data.reports?.length || 0,
        errorsCount: data.errors?.length || 0,
        summary: data.summary,
        chartDataCount: data.chartData?.length || 0,
        error: data.error,
      });

      if (!response.ok || !data.success) {
        console.error("[DEBUG] Request failed:", data.error);
        throw new Error(data.error || "Failed to fetch reports");
      }

      console.log("[DEBUG] Setting state with data");
      if (data.errors) {
        console.log("[DEBUG] Setting errors:", data.errors.length, "errors");
        setErrors(data.errors);
      }
      if (data.summary) {
        console.log("[DEBUG] Setting summary:", data.summary);
        setSummary(data.summary);
      }

      // Refresh finance data from database after successful fetch
      // The API already saves the data, so we just need to refresh the query
      await refreshFinanceData.mutateAsync();
      console.log("[DEBUG] Finance data refreshed from database");

      // Calculate distributions for all historical months
      console.log("[DEBUG] Calculating distributions for all months");
      try {
        const distributeResponse = await fetch(
          "/api/calculate-copany-distributions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ copanyId }),
          }
        );

        const distributeData = await distributeResponse.json();

        if (!distributeResponse.ok) {
          console.warn(
            "[DEBUG] Failed to calculate distributions:",
            distributeData.error
          );
          // Don't throw error, just log warning - the App Store Connect connection was successful
        } else {
          console.log("[DEBUG] Distribution calculation completed:", {
            totalMonths: distributeData.totalMonths,
            successfulMonths: distributeData.successfulMonths,
            totalInserted: distributeData.totalInserted,
          });
        }
      } catch (distributeError) {
        console.warn(
          "[DEBUG] Error calculating distributions:",
          distributeError
        );
        // Don't throw error, just log warning - the App Store Connect connection was successful
      }

      console.log("[DEBUG] State updated successfully");
    } catch (error) {
      console.error("[DEBUG] Error fetching reports:", error);
      setErrors([
        {
          reportType: "all",
          regionCode: "all",
          reportDate: "all",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      ]);
    } finally {
      setIsLoading(false);
      console.log("[DEBUG] Loading completed");
    }
  };

  if (isLoading || isLoadingFinanceData) {
    return (
      <div className="p-4">
        <LoadingView type="label" label="Loading finance reports..." />
      </div>
    );
  }

  // Debug: Log current state
  console.log("[DEBUG] Component render state:", {
    isLoading,
    isLoadingFinanceData,
    reportsCount: reports.length,
    errorsCount: errors.length,
    chartDataCount: chartData.length,
    summary,
    viewMode,
    hasSelectedReport: !!selectedReport,
  });

  if (
    reports.length === 0 &&
    chartData.length === 0 &&
    !isLoading &&
    !isLoadingFinanceData
  ) {
    console.log("[DEBUG] Showing empty placeholder");
    return (
      <div className="p-4 min-w-0">
        <EmptyPlaceholderView
          icon={
            <CurrencyDollarIcon
              className="w-16 h-16 text-gray-500 dark:text-gray-400"
              strokeWidth={1}
            />
          }
          titleKey="appStoreConnectReports"
          descriptionKey="appStoreConnectReportsDesc"
          buttonIcon={<DocumentTextIcon className="w-4 h-4" />}
          buttonTitleKey="fetchReports"
          buttonAction={() => {
            // This will be handled by the ConnectToAppStoreConnect component
            // We'll use a ref or state to trigger it, but for now, we'll keep the modal approach
            setIsModalOpen(true);
          }}
          size="lg"
        />
        <CredentialsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onFetch={async (credentials: Credentials) => {
            await handleFetchReports(credentials);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Finance Reports
          </h2>
          {summary && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {summary.success} successful, {summary.failed} failed out of{" "}
              {summary.total} total
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("chart")}
              className={`px-3 py-1 text-sm ${
                viewMode === "chart"
                  ? "bg-gray-800 dark:bg-gray-100 text-white dark:text-black"
                  : "bg-transparent text-gray-700 dark:text-gray-300"
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-3 py-1 text-sm ${
                viewMode === "monthly"
                  ? "bg-gray-800 dark:bg-gray-100 text-white dark:text-black"
                  : "bg-transparent text-gray-700 dark:text-gray-300"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode("formatted")}
              className={`px-3 py-1 text-sm ${
                viewMode === "formatted"
                  ? "bg-gray-800 dark:bg-gray-100 text-white dark:text-black"
                  : "bg-transparent text-gray-700 dark:text-gray-300"
              }`}
            >
              Reports
            </button>
          </div>
          <Button
            size="md"
            variant="secondary"
            onClick={async () => {
              setErrors([]);
              setSummary(null);
              setSelectedReport(null);
              // Refresh data from database
              await refreshFinanceData.mutateAsync();
            }}
            disabled={refreshFinanceData.isPending}
          >
            {refreshFinanceData.isPending ? "Refreshing..." : "Refresh"}
          </Button>
          <ConnectToAppStoreConnect
            copanyId={copanyId}
            onSuccess={async () => {
              await refreshFinanceData.mutateAsync();
            }}
          />
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Errors ({errors.length})
          </h3>
          <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 max-h-32 overflow-y-auto">
            {errors.slice(0, 10).map((error, index) => (
              <div key={index}>
                {error.reportType}/{error.regionCode}/{error.reportDate}:{" "}
                {error.error}
              </div>
            ))}
            {errors.length > 10 && (
              <div>... and {errors.length - 10} more errors</div>
            )}
          </div>
        </div>
      )}

      {selectedReport ? (
        <ReportDetailView
          report={selectedReport}
          viewMode={viewMode as "raw" | "formatted"}
          onViewModeChange={setViewMode}
          onBack={() => setSelectedReport(null)}
        />
      ) : viewMode === "chart" ? (
        <FinanceChartView chartData={chartData} />
      ) : viewMode === "monthly" ? (
        <MonthlyRevenueView chartData={chartData} />
      ) : (
        <ReportsListView reports={reports} onSelectReport={setSelectedReport} />
      )}
    </div>
  );
}

function CredentialsModal({
  isOpen,
  onClose,
  onFetch,
}: {
  isOpen: boolean;
  onClose: () => void;
  onFetch: (credentials: Credentials) => Promise<void>;
}) {
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);
  const [privateKeyContent, setPrivateKeyContent] = useState<string>("");
  const [keyId, setKeyId] = useState<string>("");
  const [issuerId, setIssuerId] = useState<string>("");
  const [vendorNumber, setVendorNumber] = useState<string>("");
  const [appSKU, setAppSKU] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".p8")) {
      setError("Please select a .p8 file");
      return;
    }

    setPrivateKeyFile(file);
    setError(null);

    try {
      const content = await file.text();
      setPrivateKeyContent(content);
    } catch (_err) {
      setError("Failed to read file");
      setPrivateKeyFile(null);
      setPrivateKeyContent("");
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!privateKeyContent || !keyId || !issuerId || !vendorNumber || !appSKU) {
      setError("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await onFetch({
        privateKey: privateKeyContent,
        keyId,
        issuerId,
        vendorNumber,
        appSKU,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch reports");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          App Store Connect Credentials
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              P8 Private Key File
            </label>
            <input
              type="file"
              accept=".p8"
              onChange={handleFileChange}
              className="border px-2 py-1 rounded-md border-gray-300 dark:border-gray-600 text-sm"
            />
            {privateKeyFile && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Selected: {privateKeyFile.name}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Key ID
            </label>
            <input
              type="text"
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="Enter your Key ID"
              className="border px-2 py-1 rounded-md border-gray-300 dark:border-gray-600"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Issuer ID
            </label>
            <input
              type="text"
              value={issuerId}
              onChange={(e) => setIssuerId(e.target.value)}
              placeholder="Enter your Issuer ID"
              className="border px-2 py-1 rounded-md border-gray-300 dark:border-gray-600"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Vendor Number
            </label>
            <input
              type="text"
              value={vendorNumber}
              onChange={(e) => setVendorNumber(e.target.value)}
              placeholder="Enter your Vendor Number"
              className="border px-2 py-1 rounded-md border-gray-300 dark:border-gray-600"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Used for API requests to fetch finance reports
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              App SKU
            </label>
            <input
              type="text"
              value={appSKU}
              onChange={(e) => setAppSKU(e.target.value)}
              placeholder="Enter your App SKU"
              className="border px-2 py-1 rounded-md border-gray-300 dark:border-gray-600"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Used to filter finance data for this specific app
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 justify-end">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Fetching..." : "Fetch Reports"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ReportsListView({
  reports,
  onSelectReport,
}: {
  reports: FinanceReport[];
  onSelectReport: (report: FinanceReport) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        {reports.length} reports found
      </div>
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left border-b border-gray-200 dark:border-gray-700">
                  Report Type
                </th>
                <th className="px-4 py-2 text-left border-b border-gray-200 dark:border-gray-700">
                  Region
                </th>
                <th className="px-4 py-2 text-left border-b border-gray-200 dark:border-gray-700">
                  Date
                </th>
                <th className="px-4 py-2 text-left border-b border-gray-200 dark:border-gray-700">
                  Rows
                </th>
                <th className="px-4 py-2 text-left border-b border-gray-200 dark:border-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    {report.reportType}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    {report.regionCode}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    {report.reportDate}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    {report.parsed?.rows.length || 0}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onSelectReport(report)}
                    >
                      View
                    </Button>
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

function ReportDetailView({
  report,
  viewMode,
  onViewModeChange,
  onBack,
}: {
  report: FinanceReport;
  viewMode: "raw" | "formatted";
  onViewModeChange: (mode: "raw" | "formatted") => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Button size="sm" variant="secondary" onClick={onBack}>
            ← Back
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {report.reportType} / {report.regionCode} / {report.reportDate}
          </div>
          <div className="flex gap-1 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
            <button
              onClick={() => onViewModeChange("formatted")}
              className={`px-3 py-1 text-sm ${
                viewMode === "formatted"
                  ? "bg-gray-800 dark:bg-gray-100 text-white dark:text-black"
                  : "bg-transparent text-gray-700 dark:text-gray-300"
              }`}
            >
              Formatted
            </button>
            <button
              onClick={() => onViewModeChange("raw")}
              className={`px-3 py-1 text-sm ${
                viewMode === "raw"
                  ? "bg-gray-800 dark:bg-gray-100 text-white dark:text-black"
                  : "bg-transparent text-gray-700 dark:text-gray-300"
              }`}
            >
              Raw JSON
            </button>
          </div>
        </div>
      </div>

      {viewMode === "raw" ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <pre className="p-4 bg-gray-50 dark:bg-gray-900 overflow-x-auto text-xs font-mono">
            {JSON.stringify(
              {
                reportType: report.reportType,
                regionCode: report.regionCode,
                reportDate: report.reportDate,
                data: report.data,
              },
              null,
              2
            )}
          </pre>
        </div>
      ) : report.filtered || report.parsed ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                <tr>
                  {(report.filtered || report.parsed)!.headers.map(
                    (header, index) => (
                      <th
                        key={index}
                        className="px-4 py-2 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {(report.filtered || report.parsed)!.rows.map(
                  (row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <pre className="p-4 bg-gray-50 dark:bg-gray-900 overflow-x-auto text-xs font-mono whitespace-pre-wrap">
            {report.data}
          </pre>
        </div>
      )}
    </div>
  );
}

function FinanceChartView({
  chartData,
}: {
  chartData: Array<{ date: string; amountUSD: number }>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(
    null
  );
  const isDarkMode = useDarkMode();
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<{
    date: string;
    amountUSD: number;
  }>();

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener("resize", updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const processedData = useMemo(() => {
    return chartData
      .map((item) => ({
        date: new Date(item.date + "-01"),
        amountUSD: item.amountUSD,
        dateStr: item.date,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [chartData]);

  const height = 400;
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = Math.max(containerWidth - margin.left - margin.right, 100);
  const chartHeight = height - margin.top - margin.bottom;

  const xScale = scaleTime({
    range: [0, chartWidth],
    domain:
      processedData.length > 0
        ? [processedData[0].date, processedData[processedData.length - 1].date]
        : [new Date(), new Date()],
  });

  const maxAmount = Math.max(...processedData.map((d) => d.amountUSD), 0);

  // Generate at most 5 integer tick values for Y-axis
  // Step must be a multiple of 10
  const generateYTickValues = (maxValue: number, numTicks: number = 5) => {
    if (maxValue === 0) return [0];

    // Calculate raw step value
    const rawStep = maxValue / (numTicks - 1);

    // Round up to nearest multiple of 10
    const step = Math.ceil(rawStep / 10) * 10;

    // Generate integer ticks using step
    const ticks = [];
    for (let i = 0; i < numTicks; i++) {
      ticks.push(i * step);
    }
    return ticks;
  };

  const yTickValues = generateYTickValues(maxAmount, 5);
  const maxYValue = Math.max(...yTickValues);

  const yScale = scaleLinear({
    range: [chartHeight, 0],
    domain: [0, maxYValue],
    nice: false,
  });

  if (processedData.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        No chart data available. Please fetch reports first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Historical Finance Data (USD) - {processedData.length} data points
      </div>
      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} width={containerWidth} height={height}>
          <Group left={margin.left} top={margin.top}>
            {/* Horizontal grid lines */}
            {yTickValues.map((tickValue, index) => (
              <line
                key={`grid-${index}`}
                x1={0}
                x2={chartWidth}
                y1={yScale(tickValue)}
                y2={yScale(tickValue)}
                stroke={isDarkMode ? "#4B5563" : "#E7E7E7"}
                strokeWidth={1}
              />
            ))}
            {/* Area under curve */}
            <AreaClosed
              data={processedData}
              x={(d) => xScale(d.date)}
              y={(d) => yScale(d.amountUSD)}
              yScale={yScale}
              curve={curveMonotoneX}
              fill={
                isDarkMode
                  ? "rgba(59, 130, 246, 0.2)"
                  : "rgba(59, 130, 246, 0.1)"
              }
            />
            {/* Line */}
            <LinePath
              data={processedData}
              x={(d) => xScale(d.date)}
              y={(d) => yScale(d.amountUSD)}
              curve={curveMonotoneX}
              stroke={isDarkMode ? "#60a5fa" : "#3b82f6"}
              strokeWidth={2}
            />
            {/* Invisible overlay for hover detection */}
            <rect
              width={chartWidth}
              height={chartHeight}
              fill="transparent"
              onMouseMove={(e) => {
                const svg = svgRef.current;
                if (!svg) return;

                const svgRect = svg.getBoundingClientRect();
                const svgX = e.clientX - svgRect.left - margin.left;

                // Find the closest data point by x-coordinate
                let closestIndex = 0;
                let closestPoint = processedData[0];
                let minDistance = Math.abs(
                  xScale(processedData[0].date) - svgX
                );

                for (let i = 0; i < processedData.length; i++) {
                  const point = processedData[i];
                  const distance = Math.abs(xScale(point.date) - svgX);
                  if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = point;
                    closestIndex = i;
                  }
                }

                setSelectedPointIndex(closestIndex);

                // Calculate data point position in SVG coordinates
                const pointXInSvg = xScale(closestPoint.date) + margin.left;
                const pointYInSvg = yScale(closestPoint.amountUSD) + margin.top;

                // Convert to viewport coordinates
                const pointXInViewport = svgRect.left + pointXInSvg;
                const pointYInViewport = svgRect.top + pointYInSvg;

                // Calculate tooltip position with 12px safety margin
                // Tooltip dimensions (approximate)
                const tooltipWidth = 150;
                const tooltipHeight = 60;
                const safetyMargin = 12;
                const markerRadius = 6; // Data point marker radius

                // Default position: to the right and above the data point
                let tooltipLeft =
                  pointXInViewport + markerRadius + safetyMargin;
                let tooltipTop =
                  pointYInViewport - tooltipHeight - safetyMargin;

                // Boundary detection
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                // Check if tooltip would go off right edge
                if (tooltipLeft + tooltipWidth > viewportWidth - safetyMargin) {
                  // Place to the left of data point
                  tooltipLeft =
                    pointXInViewport -
                    tooltipWidth -
                    markerRadius -
                    safetyMargin;
                }

                // Check if tooltip would go off left edge
                if (tooltipLeft < safetyMargin) {
                  tooltipLeft = safetyMargin;
                }

                // Check if tooltip would go off top edge
                if (tooltipTop < safetyMargin) {
                  // Place below data point
                  tooltipTop = pointYInViewport + markerRadius + safetyMargin;
                }

                // Check if tooltip would go off bottom edge
                if (
                  tooltipTop + tooltipHeight >
                  viewportHeight - safetyMargin
                ) {
                  tooltipTop = viewportHeight - tooltipHeight - safetyMargin;
                }

                // Ensure tooltip doesn't overlap with data point marker
                const markerLeft = pointXInViewport - markerRadius;
                const markerRight = pointXInViewport + markerRadius;
                const markerTop = pointYInViewport - markerRadius;
                const markerBottom = pointYInViewport + markerRadius;

                const tooltipRight = tooltipLeft + tooltipWidth;
                const tooltipBottom = tooltipTop + tooltipHeight;

                // Check for overlap and adjust
                if (
                  tooltipLeft < markerRight + safetyMargin &&
                  tooltipRight > markerLeft - safetyMargin &&
                  tooltipTop < markerBottom + safetyMargin &&
                  tooltipBottom > markerTop - safetyMargin
                ) {
                  // Overlap detected, adjust position
                  if (tooltipLeft < pointXInViewport) {
                    // Tooltip is on the left, move it further left
                    tooltipLeft = markerLeft - tooltipWidth - safetyMargin;
                    if (tooltipLeft < safetyMargin) {
                      tooltipLeft = safetyMargin;
                    }
                  } else {
                    // Tooltip is on the right, move it further right
                    tooltipLeft = markerRight + safetyMargin;
                    if (
                      tooltipLeft + tooltipWidth >
                      viewportWidth - safetyMargin
                    ) {
                      tooltipLeft = viewportWidth - tooltipWidth - safetyMargin;
                    }
                  }
                }

                showTooltip({
                  tooltipLeft,
                  tooltipTop,
                  tooltipData: {
                    date: closestPoint.dateStr,
                    amountUSD: closestPoint.amountUSD,
                  },
                });
              }}
              onMouseLeave={() => {
                hideTooltip();
                setSelectedPointIndex(null);
              }}
              style={{ cursor: "crosshair" }}
            />
            {/* Data point marker */}
            {selectedPointIndex !== null && (
              <circle
                cx={xScale(processedData[selectedPointIndex].date)}
                cy={yScale(processedData[selectedPointIndex].amountUSD)}
                r={6}
                fill={isDarkMode ? "#60a5fa" : "#3b82f6"}
                stroke="#ffffff"
                strokeWidth={2}
                style={{ pointerEvents: "none" }}
              />
            )}
            {/* X Axis */}
            <AxisBottom
              top={chartHeight}
              scale={xScale}
              numTicks={Math.min(processedData.length, 12)}
              stroke={isDarkMode ? "#6b7280" : "#9ca3af"}
              tickStroke={isDarkMode ? "#6b7280" : "#9ca3af"}
              tickLabelProps={() => ({
                fill: isDarkMode ? "#9ca3af" : "#6b7280",
                fontSize: 11,
                textAnchor: "middle",
              })}
              tickFormat={(date) => {
                const d = date as Date;
                return getMonthlyPeriodSimple(d);
              }}
            />
            {/* Y Axis */}
            <AxisLeft
              scale={yScale}
              tickValues={yTickValues}
              stroke={isDarkMode ? "#6b7280" : "#9ca3af"}
              tickStroke={isDarkMode ? "#6b7280" : "#9ca3af"}
              tickLabelProps={() => ({
                fill: isDarkMode ? "#9ca3af" : "#6b7280",
                fontSize: 11,
                textAnchor: "end",
                dx: -5,
              })}
              tickFormat={(value) => `$${Number(value).toLocaleString()}`}
            />
          </Group>
        </svg>
        {tooltipOpen && tooltipData && (
          <div
            style={{
              position: "fixed",
              left: tooltipLeft,
              top: tooltipTop,
              zIndex: 1000,
              pointerEvents: "none",
            }}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 text-sm"
          >
            <div className="text-gray-900 dark:text-gray-100">
              <div className="font-semibold">{tooltipData.date}</div>
              <div>
                $
                {tooltipData.amountUSD.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                USD
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MonthlyRevenueView({
  chartData,
}: {
  chartData: Array<{
    date: string;
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
  }>;
}) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  if (chartData.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        No monthly data available. Please fetch reports first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Monthly Revenue Summary - {chartData.length} months
      </div>
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left border-b border-gray-200 dark:border-gray-700">
                  Month
                </th>
                <th className="px-4 py-3 text-left border-b border-gray-200 dark:border-gray-700">
                  Transactions
                </th>
                <th className="px-4 py-3 text-right border-b border-gray-200 dark:border-gray-700">
                  Total Revenue (USD)
                </th>
                <th className="px-4 py-3 text-center border-b border-gray-200 dark:border-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((month) => (
                <>
                  <tr
                    key={month.date}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    onClick={() =>
                      setExpandedMonth(
                        expandedMonth === month.date ? null : month.date
                      )
                    }
                  >
                    <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-base">
                      {month.date}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      {month.count}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-right font-semibold">
                      $
                      {month.amountUSD.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-center">
                      <button
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedMonth(
                            expandedMonth === month.date ? null : month.date
                          );
                        }}
                      >
                        {expandedMonth === month.date ? "Hide" : "Show"} Details
                      </button>
                    </td>
                  </tr>
                  {expandedMonth === month.date && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-4 bg-gray-50 dark:bg-gray-900"
                      >
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                            Transaction Details ({month.transactions.length}{" "}
                            transactions)
                          </div>
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                                  <tr>
                                    <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700">
                                      Date
                                    </th>
                                    <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700">
                                      Amount
                                    </th>
                                    <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700">
                                      Currency
                                    </th>
                                    <th className="px-3 py-2 text-right border-b border-gray-200 dark:border-gray-700">
                                      USD
                                    </th>
                                    <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700">
                                      Type
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {month.transactions.map((tx, idx) => (
                                    <tr
                                      key={idx}
                                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                    >
                                      <td className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                        {tx.transactionDate || tx.date}
                                      </td>
                                      <td className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                        {tx.amount.toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </td>
                                      <td className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                        {tx.currency}
                                      </td>
                                      <td className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-right">
                                        $
                                        {tx.amountUSD.toLocaleString(
                                          undefined,
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          }
                                        )}
                                      </td>
                                      <td className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                        {tx.type}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
