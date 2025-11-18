"use client";

import { useMemo } from "react";
import { Group } from "@visx/group";
import { LinePath, AreaClosed } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { scaleLinear, scaleTime } from "@visx/scale";
import type { ChartDataPoint } from "@/utils/finance";

interface MiniFinanceChartProps {
  chartData: ChartDataPoint[];
  isDarkMode: boolean;
  hasNoData?: boolean;
}

/**
 * Mini finance chart component for card display
 */
export default function MiniFinanceChart({
  chartData,
  isDarkMode,
  hasNoData = false,
}: MiniFinanceChartProps) {
  const width = 120;
  const height = 60;
  const margin = { top: 4, right: 4, bottom: 4, left: 4 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Process data
  const processedData = useMemo(() => {
    if (hasNoData || chartData.length === 0) {
      // Generate empty flat line data for "no data" display
      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          date,
          amountUSD: 0,
        });
      }
      return months;
    }
    return chartData
      .map((item) => ({
        date: new Date(item.date + "-01"),
        amountUSD: item.amountUSD,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [chartData, hasNoData]);

  // Calculate scales using visx scales
  const maxAmount = Math.max(...processedData.map((d) => d.amountUSD), 0);
  const minAmount = Math.min(...processedData.map((d) => d.amountUSD), 0);
  const range = maxAmount - minAmount || 1;

  // X scale (time) using visx scaleTime
  const xScale = scaleTime({
    range: [0, chartWidth],
    domain:
      processedData.length > 0
        ? [processedData[0].date, processedData[processedData.length - 1].date]
        : [new Date(), new Date()],
  });

  // Y scale (amount) using visx scaleLinear
  const yScale = scaleLinear({
    range: [chartHeight, 0],
    domain: hasNoData
      ? [0, 1] // For no data, use a fixed domain (0 maps to bottom)
      : range === 0
      ? [0, 1] // If all values are the same, use default domain
      : [minAmount - range * 0.1, maxAmount + range * 0.1],
    nice: false,
  });

  const lineColor = hasNoData
    ? isDarkMode
      ? "rgba(156, 163, 175, 0.5)"
      : "rgba(107, 114, 128, 0.5)"
    : "#7987FF";
  const areaColor = hasNoData
    ? "transparent"
    : isDarkMode
    ? "rgba(121, 135, 255, 0.15)"
    : "rgba(121, 135, 255, 0.1)";

  return (
    <div className="w-30 h-15 shrink-0">
      <svg width={width} height={height} className="overflow-visible">
        <Group left={margin.left} top={margin.top}>
          {/* Area under curve */}
          <AreaClosed
            data={processedData}
            x={(d) => xScale(d.date)}
            y={(d) => yScale(d.amountUSD)}
            yScale={yScale}
            curve={curveMonotoneX}
            fill={areaColor}
          />
          {/* Line */}
          <LinePath
            data={processedData}
            x={(d) => xScale(d.date)}
            y={(d) => yScale(d.amountUSD)}
            curve={curveMonotoneX}
            stroke={lineColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Group>
      </svg>
    </div>
  );
}

