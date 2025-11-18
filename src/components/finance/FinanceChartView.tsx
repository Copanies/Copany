"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Group } from "@visx/group";
import { LinePath, AreaClosed } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { scaleLinear, scaleTime } from "@visx/scale";
import { AxisBottom } from "@visx/axis";
import { useTooltip } from "@visx/tooltip";
import { useDarkMode } from "@/utils/useDarkMode";
import { getMonthlyPeriodSimple } from "@/utils/time";

export interface FinanceChartDataPoint {
  date: string; // YYYY-MM format
  amountUSD: number;
}

interface FinanceChartViewProps {
  chartData: FinanceChartDataPoint[];
  size?: "small" | "large";
  title?: string;
  emptyMessage?: string;
}

export default function FinanceChartView({
  chartData,
  size = "large",
  emptyMessage = "No chart data available.",
}: FinanceChartViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(
    null
  );
  const isDarkMode = useDarkMode();
  const gridColor = isDarkMode
    ? "rgba(148, 163, 184, 0.25)"
    : "rgba(15, 23, 42, 0.08)";
  const axisColor = isDarkMode
    ? "rgba(148, 163, 184, 0.45)"
    : "rgba(15, 23, 42, 0.18)";
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

  const [containerHeight, setContainerHeight] = useState(
    size === "small" ? 240 : 400
  );

  useEffect(() => {
    if (size === "small") {
      setContainerHeight(240);
      return;
    }

    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.offsetHeight;
        if (height > 0) {
          setContainerHeight(height);
        }
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener("resize", updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [size]);

  const height = size === "small" ? 240 : Math.max(containerHeight, 400);
  const margin =
    size === "small"
      ? { top: 10, right: 10, bottom: 10, left: 10 }
      : { top: 20, right: 20, bottom: 40, left: 20 };
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
  const minAmount = Math.min(...processedData.map((d) => d.amountUSD), 0);

  // Generate at most 5 integer tick values for Y-axis
  // Step must be a multiple of 10
  const generateYTickValues = (
    maxValue: number,
    minValue: number,
    numTicks: number = 5
  ) => {
    if (maxValue === 0 && minValue === 0) return [0];

    const range = maxValue - minValue;
    if (range === 0) {
      // All values are the same
      const center = maxValue;
      const step = Math.max(10, Math.ceil(Math.abs(center) / 10) * 10);
      const ticks = [];
      for (let i = -2; i <= 2; i++) {
        ticks.push(center + i * step);
      }
      return ticks.filter((t) => t >= 0 || t <= 0); // Include negative values
    }

    // Calculate raw step value
    const rawStep = range / (numTicks - 1);

    // Round up to nearest multiple of 10
    const step = Math.ceil(rawStep / 10) * 10;

    // Generate integer ticks using step, starting from a rounded value below min
    const startValue = Math.floor(minValue / step) * step;
    const ticks = [];
    for (let i = 0; i < numTicks; i++) {
      ticks.push(startValue + i * step);
    }
    return ticks;
  };

  const yTickValues = generateYTickValues(maxAmount, minAmount, 5);
  const maxYValue = Math.max(...yTickValues);
  const minYValue = Math.min(...yTickValues);

  const yScale = scaleLinear({
    range: [chartHeight, 0],
    domain: [minYValue, maxYValue],
    nice: false,
  });

  if (processedData.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      <div ref={containerRef} className="w-full flex-1 min-h-0">
        <svg ref={svgRef} width={containerWidth} height={height}>
          <Group left={margin.left} top={margin.top}>
            {/* Horizontal grid lines */}
            {yTickValues.map((tickValue, index) => (
              <line
                key={`grid-h-${index}`}
                x1={0}
                x2={chartWidth}
                y1={yScale(tickValue)}
                y2={yScale(tickValue)}
                stroke={gridColor}
                strokeWidth={1}
              />
            ))}
            {/* Vertical grid lines */}
            {xScale
              .ticks(Math.min(processedData.length, 12))
              .map((tickValue, index) => (
                <line
                  key={`grid-v-${index}`}
                  x1={xScale(tickValue)}
                  x2={xScale(tickValue)}
                  y1={0}
                  y2={chartHeight}
                  stroke={gridColor}
                  strokeWidth={1}
                />
              ))}
            {/* Zero line (if visible) */}
            {minYValue < 0 && maxYValue > 0 && (
              <line
                x1={0}
                x2={chartWidth}
                y1={yScale(0)}
                y2={yScale(0)}
                stroke={axisColor}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            )}
            {/* Area under curve */}
            <AreaClosed
              data={processedData}
              x={(d) => xScale(d.date)}
              y={(d) => yScale(d.amountUSD)}
              yScale={yScale}
              curve={curveMonotoneX}
              fill={
                isDarkMode
                  ? "rgba(121, 135, 255, 0.2)"
                  : "rgba(121, 135, 255, 0.1)"
              }
            />
            {/* Line */}
            <LinePath
              data={processedData}
              x={(d) => xScale(d.date)}
              y={(d) => yScale(d.amountUSD)}
              curve={curveMonotoneX}
              stroke="#7987FF"
              strokeWidth={5}
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
                fill="#7987FF"
                stroke="#ffffff"
                strokeWidth={2}
                style={{ pointerEvents: "none" }}
              />
            )}
            {/* X Axis */}
            {size === "large" && (
              <AxisBottom
                top={chartHeight}
                scale={xScale}
                numTicks={Math.min(processedData.length, 12)}
                stroke={axisColor}
                tickStroke={axisColor}
                tickLabelProps={() => ({
                  fill: isDarkMode ? "#9ca3af" : "#6b7280",
                  fontSize: 11,
                  textAnchor: "middle",
                })}
                tickFormat={(date, index) => {
                  const d = date as Date;
                  const monthStr = getMonthlyPeriodSimple(d);

                  // Check if this is the first month of a year
                  const isFirstMonth = index === 0;
                  const prevTick =
                    index > 0
                      ? xScale.ticks(Math.min(processedData.length, 12))[
                          index - 1
                        ]
                      : null;
                  const yearChanged =
                    prevTick &&
                    (prevTick as Date).getFullYear() !== d.getFullYear();

                  if (isFirstMonth || yearChanged) {
                    // Show year only on first month of each year
                    const months = [
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ];
                    return `${months[d.getMonth()]} ${d.getFullYear()}`;
                  }

                  // Otherwise show only month
                  const months = [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ];
                  return months[d.getMonth()];
                }}
              />
            )}
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
                {tooltipData.amountUSD < 0 ? "-" : ""}$
                {Math.abs(tooltipData.amountUSD).toLocaleString(undefined, {
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
