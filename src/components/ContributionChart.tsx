"use client";
import React, { useRef, useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Group } from "@visx/group";
import { Bar, LinePath } from "@visx/shape";
import { scaleLinear, scaleBand } from "@visx/scale";
import { AxisBottom, AxisLeft, AxisRight } from "@visx/axis";
import { useTooltip } from "@visx/tooltip";
import {
  Contribution,
  IssueLevel,
  AssigneeUser,
  LEVEL_SCORES as levelScores,
} from "@/types/database.types";
import { useDarkMode } from "@/utils/useDarkMode";

// Define display level types (excluding level_None)
type DisplayLevel =
  | IssueLevel.level_C
  | IssueLevel.level_B
  | IssueLevel.level_A
  | IssueLevel.level_S;

interface ContributionData {
  month: string;
  year: number;
  levelCounts: Record<DisplayLevel, number>;
  total: number;
  contributionScore: number;
}

interface UserContributionData {
  user: AssigneeUser;
  monthlyData: ContributionData[];
}

interface MonthRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

interface ContributionChartProps {
  contributions: Contribution[];
  user: AssigneeUser;
  globalMaxCount?: number;
  globalMaxScore: number; // Required parameter
  monthRange: MonthRange;
  showUserInfo?: boolean; // New: whether to show user info, default true
  totalContributionScore?: number; // New: total contribution score of all users for percentage calculation
  rank?: number; // New: user's rank based on total contribution score
}

interface TooltipData {
  type: "bar" | "line";
  month: string;
  year: number;
  level?: DisplayLevel;
  count?: number;
  contributionScore?: number;
  issues?: Array<{ id: string; title: string }>;
}

// Month abbreviations
const monthNames = [
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

// Level colors - now with light/dark mode support
const levelColors: Record<DisplayLevel, { light: string; dark: string }> = {
  [IssueLevel.level_C]: { light: "#7987FF", dark: "#60A5FA" }, // blue - more vibrant in dark
  [IssueLevel.level_B]: { light: "#E697FF", dark: "#A78BFA" }, // purple - more vibrant
  [IssueLevel.level_A]: { light: "#FFA5CB", dark: "#F472B6" }, // pink - more vibrant
  [IssueLevel.level_S]: { light: "#FFE372", dark: "#FBBF24" }, // yellow - more vibrant
};

const levelStrokeColors: Record<DisplayLevel, { light: string; dark: string }> =
  {
    [IssueLevel.level_C]: { light: "#165BAA", dark: "#3B82F6" }, // blue - brighter stroke
    [IssueLevel.level_B]: { light: "#A155B9", dark: "#8B5CF6" }, // purple - brighter stroke
    [IssueLevel.level_A]: { light: "#F765A3", dark: "#EC4899" }, // pink - brighter stroke
    [IssueLevel.level_S]: { light: "#E6B800", dark: "#F59E0B" }, // yellow - brighter stroke
  };

// Level labels
const levelLabels: Record<DisplayLevel, string> = {
  [IssueLevel.level_C]: "C",
  [IssueLevel.level_B]: "B",
  [IssueLevel.level_A]: "A",
  [IssueLevel.level_S]: "S",
};

// Display level list
const displayLevels: DisplayLevel[] = [
  IssueLevel.level_C,
  IssueLevel.level_B,
  IssueLevel.level_A,
  IssueLevel.level_S,
];

export default function ContributionChart({
  contributions,
  user,
  globalMaxCount,
  globalMaxScore,
  monthRange,
  showUserInfo = true,
  totalContributionScore = 0,
  rank,
}: ContributionChartProps) {
  // Process data: statistics by month and level
  const userContributionData = useMemo(() => {
    const monthlyData: ContributionData[] = [];

    // Generate month list based on monthRange
    for (let year = monthRange.startYear; year <= monthRange.endYear; year++) {
      const startMonth =
        year === monthRange.startYear ? monthRange.startMonth : 1;
      const endMonth = year === monthRange.endYear ? monthRange.endMonth : 12;

      for (let month = startMonth; month <= endMonth; month++) {
        monthlyData.push({
          month: monthNames[month - 1],
          year: year,
          levelCounts: {
            [IssueLevel.level_C]: 0,
            [IssueLevel.level_B]: 0,
            [IssueLevel.level_A]: 0,
            [IssueLevel.level_S]: 0,
          },
          total: 0,
          contributionScore: 0,
        });
      }
    }

    // Statistics contribution data
    contributions.forEach((contribution) => {
      const month = monthNames[contribution.month - 1];
      const year = contribution.year;
      const level = contribution.issue_level as DisplayLevel;

      // Check level validity
      if (!displayLevels.includes(level)) {
        return;
      }

      const monthData = monthlyData.find(
        (data) => data.month === month && data.year === year
      );

      if (monthData) {
        monthData.levelCounts[level]++;
        monthData.total++;
        monthData.contributionScore += levelScores[level] || 0;
      }
    });

    return {
      user,
      monthlyData,
    };
  }, [contributions, user, monthRange]);

  // If globalMaxCount is not provided, calculate local max value as fallback
  const effectiveMaxCount =
    globalMaxCount ??
    Math.max(
      ...userContributionData.monthlyData.map((monthData) => monthData.total),
      1 // Ensure at least 1
    );

  // Check if there is contribution data
  const hasData = userContributionData.monthlyData.some(
    (monthData) => monthData.total > 0
  );

  if (!hasData) {
    return (
      <div className="w-full">
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          {user.name} No contribution data
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <UserChart
        userData={userContributionData}
        globalMaxCount={effectiveMaxCount}
        globalMaxScore={globalMaxScore}
        showUserInfo={showUserInfo}
        totalContributionScore={totalContributionScore}
        rank={rank}
        contributions={contributions}
      />
    </div>
  );
}

interface UserChartProps {
  userData: UserContributionData;
  globalMaxCount: number;
  globalMaxScore: number;
  showUserInfo: boolean;
  totalContributionScore: number;
  rank?: number; // New: user's rank based on total contribution score
  contributions: Contribution[]; // Add contributions parameter
}

function UserChart({
  userData,
  globalMaxCount,
  globalMaxScore,
  showUserInfo,
  totalContributionScore,
  rank,
  contributions,
}: UserChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Use custom hook to detect dark mode
  const isDarkMode = useDarkMode();

  // Use visx's useTooltip hook
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<TooltipData>();

  useEffect(() => {
    // Use ResizeObserver to monitor container size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    });

    // Initialize width
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    };

    // Try to get width immediately
    updateWidth();

    // If initial width is 0, use setTimeout to delay getting it
    if (containerRef.current && containerRef.current.offsetWidth === 0) {
      setTimeout(updateWidth, 0);
      setTimeout(updateWidth, 100);
    }

    // Start monitoring container size changes
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Monitor window size changes as backup
    window.addEventListener("resize", updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const height = 200;
  const margin = { top: 32, right: 32, bottom: 32, left: 32 }; // Increase right margin for line chart Y-axis
  const availableWidth = containerWidth - margin.left - margin.right;
  const chartWidth = availableWidth > 50 ? availableWidth : 50; // Ensure minimum width of 50px
  const chartHeight = height - margin.top - margin.bottom;

  // Note: removed unused yScale and yScoreScale variables

  const xScale = scaleBand<string>({
    range: [0, chartWidth],
    domain: userData.monthlyData.map((d) => d.month),
    padding: 0.2,
  });

  // Create sub-scale for level grouping within each month
  const levelScale = scaleBand<DisplayLevel>({
    range: [0, xScale.bandwidth()],
    domain: displayLevels,
    padding: 0.1,
  });

  // Calculate max count for each level across all months for proper Y-axis scaling
  const maxLevelCount = Math.max(
    ...userData.monthlyData.flatMap((monthData) =>
      displayLevels.map((level) => monthData.levelCounts[level])
    ),
    1
  );

  // Use the greater of globalMaxCount and maxLevelCount for Y-axis
  const effectiveMaxCount = Math.max(globalMaxCount, maxLevelCount);

  // Update yScale to use the effective max count
  const yScaleAdjusted = scaleLinear<number>({
    range: [chartHeight, 0],
    domain: [0, effectiveMaxCount],
  });

  // Calculate max contribution score for this user's data
  const maxContributionScore = Math.max(
    ...userData.monthlyData.map((monthData) => monthData.contributionScore),
    1
  );

  // Use the greater of globalMaxScore and local max for contribution points Y-axis
  const effectiveMaxScore = Math.max(globalMaxScore, maxContributionScore);

  // Update contribution points Y-axis scale
  const yScoreScaleAdjusted = scaleLinear<number>({
    range: [chartHeight, 0],
    domain: [0, effectiveMaxScore],
  });

  // Generate consistent tick values for both Y-axes (max 3 ticks)
  const generateTickValues = (maxValue: number, numTicks: number = 3) => {
    const ticks = [];
    for (let i = 0; i <= numTicks - 1; i++) {
      ticks.push((maxValue * i) / (numTicks - 1));
    }
    return ticks;
  };

  const leftYTickValues = generateTickValues(effectiveMaxCount);
  const rightYTickValues = generateTickValues(effectiveMaxScore);

  // Prepare data points for line chart
  const lineData = userData.monthlyData.map((monthData) => ({
    x: (xScale(monthData.month) || 0) + xScale.bandwidth() / 2, // Center position of bar
    y: yScoreScaleAdjusted(monthData.contributionScore),
    score: monthData.contributionScore,
  }));

  // Handle mouse events for tooltip
  const handleBarMouseEnter = (
    event: React.MouseEvent<SVGRectElement>,
    monthData: ContributionData,
    level: DisplayLevel
  ) => {
    const count = monthData.levelCounts[level];
    if (count === 0) return;

    // Find all Issues for this month and level
    const monthIssues = contributions
      .filter(
        (contribution: Contribution) =>
          contribution.issue_level === level &&
          contribution.month === monthNames.indexOf(monthData.month) + 1 &&
          contribution.year === monthData.year
      )
      .map((contribution: Contribution) => ({
        id: contribution.issue_id,
        title: contribution.issue_title,
      }));

    const tooltipData: TooltipData = {
      type: "bar",
      month: monthData.month,
      year: monthData.year,
      level,
      count,
      issues: monthIssues,
    };

    // Calculate tooltip position, ensuring it stays within window bounds with 12px safety margin
    const tooltipHeight = Math.min(200 + monthIssues.length * 24, 400); // Dynamic height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let tooltipLeft = event.clientX + 2; // Close to mouse position
    let tooltipTop = event.clientY - tooltipHeight - 10;

    // Get actual tooltip width
    const tooltipContent = generateTooltipContent(
      monthData,
      monthIssues,
      "bar",
      level,
      count
    );
    const tooltipWidth = getTooltipWidth(tooltipContent);

    // Horizontal boundary detection with 12px safety margin
    if (tooltipLeft + tooltipWidth > viewportWidth - 12) {
      tooltipLeft = event.clientX - tooltipWidth - 2; // Use actual width, leave 2px spacing on left
    }
    if (tooltipLeft < 12) {
      tooltipLeft = 12; // Ensure 12px left margin
    }

    // Vertical boundary detection
    if (tooltipTop < 12) {
      tooltipTop = event.clientY + 10; // Display below mouse if top space is insufficient
    }
    if (tooltipTop + tooltipHeight > viewportHeight - 12) {
      tooltipTop = viewportHeight - tooltipHeight - 12; // Ensure 12px bottom margin
    }

    showTooltip({
      tooltipData,
      tooltipLeft,
      tooltipTop,
    });
  };

  const handleLinePointMouseEnter = (
    event: React.MouseEvent<SVGCircleElement>,
    monthData: ContributionData
  ) => {
    // Find all Issues for this month
    const monthIssues = contributions
      .filter(
        (contribution: Contribution) =>
          contribution.month === monthNames.indexOf(monthData.month) + 1 &&
          contribution.year === monthData.year
      )
      .map((contribution: Contribution) => ({
        id: contribution.issue_id,
        title: contribution.issue_title,
      }));

    const tooltipData: TooltipData = {
      type: "line",
      month: monthData.month,
      year: monthData.year,
      contributionScore: monthData.contributionScore,
      count: Object.values(monthData.levelCounts).reduce(
        (sum, v) => sum + v,
        0
      ),
      issues: monthIssues,
    };

    // Calculate tooltip position, ensuring it stays within window bounds with 12px safety margin
    const tooltipHeight = Math.min(150 + monthIssues.length * 24, 400); // Dynamic height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let tooltipLeft = event.clientX + 2; // Close to mouse position
    let tooltipTop = event.clientY - tooltipHeight - 10;

    // Get actual tooltip width
    const tooltipContent = generateTooltipContent(
      monthData,
      monthIssues,
      "line"
    );
    const tooltipWidth = getTooltipWidth(tooltipContent);

    // Horizontal boundary detection with 12px safety margin
    if (tooltipLeft + tooltipWidth > viewportWidth - 12) {
      tooltipLeft = event.clientX - tooltipWidth - 2; // Use actual width, leave 2px spacing on left
    }
    if (tooltipLeft < 12) {
      tooltipLeft = 12; // Ensure 12px left margin
    }

    // Vertical boundary detection
    if (tooltipTop < 12) {
      tooltipTop = event.clientY + 10; // Display below mouse if top space is insufficient
    }
    if (tooltipTop + tooltipHeight > viewportHeight - 12) {
      tooltipTop = viewportHeight - tooltipHeight - 12; // Ensure 12px bottom margin
    }

    showTooltip({
      tooltipData,
      tooltipLeft,
      tooltipTop,
    });
  };

  // Helper function to get actual tooltip width
  const getTooltipWidth = (content: string): number => {
    const tempTooltip = document.createElement("div");
    tempTooltip.className =
      "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 text-sm max-h-96 overflow-y-auto min-w-48 max-w-sm";
    tempTooltip.style.position = "fixed";
    tempTooltip.style.left = "-9999px"; // Place outside viewport
    tempTooltip.style.visibility = "hidden";
    document.body.appendChild(tempTooltip);

    tempTooltip.innerHTML = content;
    const width = tempTooltip.offsetWidth;
    document.body.removeChild(tempTooltip);

    return width;
  };

  // Helper function to generate tooltip content
  const generateTooltipContent = (
    monthData: ContributionData,
    monthIssues: Array<{ id: string; title: string }>,
    type: "bar" | "line",
    level?: DisplayLevel,
    count?: number
  ): string => {
    const baseContent = `
      <div class="font-semibold text-gray-900 dark:text-gray-100 mb-2">
        ${monthData.month} ${monthData.year}
      </div>
      <div class="space-y-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            ${
              type === "bar"
                ? `<div class="w-2 h-2 rounded-full" style="background-color: ${
                    isDarkMode
                      ? levelColors[level!].dark
                      : levelColors[level!].light
                  };"></div>
                 <span class="font-medium text-gray-900 dark:text-gray-100">Level ${
                   levelLabels[level!]
                 }</span>`
                : `<div class="w-4 h-0.5" style="background-color: ${
                    isDarkMode ? "#3B82F6" : "#2563eb"
                  };"></div>
                 <span class="font-medium text-gray-900 dark:text-gray-100">Total CP</span>`
            }
          </div>
          ${
            type === "bar"
              ? `<div class="text-gray-600 dark:text-gray-400">
                 Issues: <span class="font-medium text-gray-900 dark:text-gray-100">${count}</span>
               </div>
               <div class="text-gray-600 dark:text-gray-400">
                 CP: <span class="font-medium text-gray-900 dark:text-gray-100">${
                   count! * levelScores[level!]
                 }</span>
               </div>`
              : `<div class="text-gray-600 dark:text-gray-400">
                 CP: <span class="font-medium text-gray-900 dark:text-gray-100">${monthData.contributionScore}</span>
               </div>`
          }
        </div>
        ${
          monthIssues.length > 0
            ? `
          <div class="space-y-1 border-t border-gray-200 dark:border-gray-600 pt-2">
            <div class="text-xs font-medium text-gray-700 dark:text-gray-300">
              Related Issues${
                type === "line" ? ` (${monthIssues.length})` : ""
              }:
            </div>
            <div class="space-y-1 max-h-32 overflow-y-auto">
              ${monthIssues
                .map(
                  (issue) => `
                <div class="text-xs text-gray-600 dark:text-gray-400 truncate">
                  • ${issue.title}
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;

    return baseContent;
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  // Dynamic colors based on theme
  const gridColor = isDarkMode ? "#4B5563" : "#E7E7E7"; // gray-600 : gray-200 - lighter grid in dark mode
  const axisColor = isDarkMode ? "#4B5563" : "#E7E7E7"; // gray-600 : gray-200 - lighter axis in dark mode
  const lineColor = isDarkMode ? "#60A5FA" : "#2563eb"; // blue-400 : blue-600 - more vibrant line in dark mode

  const getLevelColor = (level: DisplayLevel) =>
    isDarkMode ? levelColors[level].dark : levelColors[level].light;

  const getLevelStrokeColor = (level: DisplayLevel) =>
    isDarkMode ? levelStrokeColors[level].dark : levelStrokeColors[level].light;

  // If container width is invalid, show loading state
  if (containerWidth <= 0) {
    return (
      <div ref={containerRef} className="mb-10 w-full relative">
        {showUserInfo && (
          <>
            {/* User Info */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <Image
                  src={userData.user.avatar_url}
                  alt={userData.user.name}
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full mr-2.5"
                />
                <div>
                  <div className="font-bold text-gray-900 dark:text-gray-100">
                    {userData.user.name}
                  </div>
                </div>
              </div>

              {/* Rank display in top-right corner */}
              {rank !== undefined && (
                <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-[2px]">
                  #{rank}
                </div>
              )}
            </div>

            {/* Contribution Stats */}
            <ContributionStats
              userData={userData}
              totalContributionScore={totalContributionScore}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="mb-10 w-full relative">
      {showUserInfo && (
        <>
          {/* User Info */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <Image
                src={userData.user.avatar_url}
                alt={userData.user.name}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full mr-2.5"
              />
              <div>
                <div className="font-bold text-gray-900 dark:text-gray-100">
                  {userData.user.name}
                </div>
              </div>
            </div>

            {/* Rank display in top-right corner */}
            {rank !== undefined && (
              <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-[2px]">
                #{rank}
              </div>
            )}
          </div>

          {/* Contribution Stats */}
          <ContributionStats
            userData={userData}
            totalContributionScore={totalContributionScore}
          />
        </>
      )}

      {/* Chart */}
      <svg width={containerWidth} height={height}>
        <Group left={margin.left} top={margin.top}>
          {/* Horizontal grid lines */}
          {leftYTickValues.map((tickValue, index) => (
            <line
              key={`grid-${index}`}
              x1={0}
              x2={chartWidth}
              y1={yScaleAdjusted(tickValue)}
              y2={yScaleAdjusted(tickValue)}
              stroke={gridColor}
              strokeWidth={1}
            />
          ))}

          {/* X-axis */}
          <AxisBottom
            top={chartHeight}
            scale={xScale}
            tickFormat={(value, index) => {
              // Find corresponding month data
              const monthData = userData.monthlyData.find(
                (d) => d.month === value
              );
              if (!monthData) return value;

              // Show year if it's the first month or year differs from previous month
              const isFirstMonth = index === 0;
              const prevMonthData =
                index > 0 ? userData.monthlyData[index - 1] : null;
              const yearChanged =
                prevMonthData && prevMonthData.year !== monthData.year;

              if (isFirstMonth || yearChanged) {
                return `${value} ${monthData.year}`;
              }
              return value;
            }}
            tickStroke={axisColor}
            stroke={axisColor}
            tickLabelProps={() => ({
              fill: isDarkMode ? "#F3F4F6" : "#374151", // gray-100 : gray-700
              fontSize: 12,
              textAnchor: "middle",
            })}
          />

          {/* Left Y-axis - Issue Count */}
          <AxisLeft
            scale={yScaleAdjusted}
            tickValues={leftYTickValues}
            tickFormat={(value) =>
              Number.isInteger(Number(value)) ? value.toString() : ""
            }
            tickStroke={axisColor}
            stroke={axisColor}
            tickLabelProps={() => ({
              fill: isDarkMode ? "#F3F4F6" : "#374151", // gray-100 : gray-700
              fontSize: 12,
              textAnchor: "end",
            })}
          />

          {/* Right Y-axis - Contribution CP */}
          <AxisRight
            left={chartWidth}
            scale={yScoreScaleAdjusted}
            tickValues={rightYTickValues}
            tickFormat={(value) =>
              Number.isInteger(Number(value)) ? value.toString() : ""
            }
            tickStroke={axisColor}
            stroke={axisColor}
            tickLabelProps={() => ({
              fill: isDarkMode ? "#F3F4F6" : "#374151", // gray-100 : gray-700
              fontSize: 12,
              textAnchor: "start",
            })}
          />

          {/* Draw grouped bar chart */}
          {userData.monthlyData.map((monthData) => {
            const monthX = xScale(monthData.month) || 0;

            return displayLevels.map((level) => {
              const count = monthData.levelCounts[level];

              if (count === 0) return null;

              const levelX = monthX + (levelScale(level) || 0);
              const barWidth = levelScale.bandwidth();
              const barHeight = chartHeight - yScaleAdjusted(count);
              const barY = yScaleAdjusted(count);

              return (
                <Bar
                  key={`${monthData.month}-${level}`}
                  x={levelX}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  fill={getLevelColor(level)}
                  stroke={getLevelStrokeColor(level)}
                  strokeWidth={2}
                  rx={4}
                  ry={4}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(event) =>
                    handleBarMouseEnter(event, monthData, level)
                  }
                  onMouseLeave={handleMouseLeave}
                />
              );
            });
          })}

          {/* Draw contribution points line chart */}
          {lineData.length > 1 && (
            <LinePath
              data={lineData}
              x={(d) => d.x}
              y={(d) => d.y}
              stroke={lineColor}
              strokeWidth={3}
              fill="none"
            />
          )}

          {/* Draw line chart data points */}
          {lineData.map((point, index) => {
            const monthData = userData.monthlyData[index];
            return (
              <circle
                key={`point-${index}`}
                cx={point.x}
                cy={point.y}
                r={isDarkMode ? 5 : 4} // slightly larger points in dark mode
                fill={lineColor}
                stroke={isDarkMode ? "#111827" : "#ffffff"} // gray-900 : white - darker stroke for better contrast
                strokeWidth={isDarkMode ? 3 : 2} // thicker stroke in dark mode
                style={{ cursor: "pointer" }}
                onMouseEnter={(event) =>
                  handleLinePointMouseEnter(event, monthData)
                }
                onMouseLeave={handleMouseLeave}
              />
            );
          })}
        </Group>
      </svg>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <div
          style={{
            position: "fixed",
            left: tooltipLeft,
            top: tooltipTop,
            zIndex: 1000,
            pointerEvents: "none",
          }}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 text-sm min-w-48 max-w-sm"
        >
          <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {tooltipData.month} {tooltipData.year}
          </div>

          {tooltipData.type === "bar" &&
            tooltipData.level &&
            tooltipData.count !== undefined && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: getLevelColor(tooltipData.level),
                      }}
                    />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Level {levelLabels[tooltipData.level]}
                    </span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Issues:{" "}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {tooltipData.count}
                    </span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    CP:{" "}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {tooltipData.count * levelScores[tooltipData.level]}
                    </span>
                  </div>
                </div>

                {/* Issues 列表 */}
                {tooltipData.issues && tooltipData.issues.length > 0 && (
                  <div className="space-y-1 border-t border-gray-200 dark:border-gray-600 pt-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Related Issues:
                    </div>
                    <div className="space-y-1">
                      {tooltipData.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className="text-xs text-gray-600 dark:text-gray-400 truncate"
                          title={issue.title}
                        >
                          • {issue.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          {tooltipData.type === "line" &&
            tooltipData.contributionScore !== undefined && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-0.5"
                      style={{
                        backgroundColor: isDarkMode ? "#3B82F6" : "#2563eb",
                      }}
                    />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Total CP
                    </span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Issues:{" "}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {tooltipData.count}
                    </span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    CP:{" "}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {tooltipData.contributionScore}
                    </span>
                  </div>
                </div>

                {/* Issues 列表 */}
                {tooltipData.issues && tooltipData.issues.length > 0 && (
                  <div className="space-y-1 border-t border-gray-200 dark:border-gray-600 pt-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Related Issues:
                    </div>
                    <div className="space-y-1">
                      {tooltipData.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className="text-xs text-gray-600 dark:text-gray-400 truncate"
                          title={issue.title}
                        >
                          • {issue.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-row mt-2 gap-3 justify-between font-semibold text-xs">
        <div className="flex gap-3 flex-wrap gap-y-1">
          {/* Issue Level Legend */}
          {displayLevels.map((level) => (
            <div key={level} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getLevelColor(level) }}
              />
              <span className="text-gray-900 dark:text-gray-100">
                {levelLabels[level]}
              </span>
            </div>
          ))}
          {/* Contribution CP Line Legend */}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5" style={{ backgroundColor: lineColor }} />
            <span className="text-gray-900 dark:text-gray-100">CP</span>
          </div>
        </div>
        <div className="flex gap-3 text-gray-600 dark:text-gray-400">
          <div className="">L/Y - Issues</div>
          <div className="">R/Y - CP</div>
        </div>
      </div>
    </div>
  );
}

interface ContributionStatsProps {
  userData: UserContributionData;
  totalContributionScore: number;
}

function ContributionStats({
  userData,
  totalContributionScore,
}: ContributionStatsProps) {
  // Calculate user's total contribution score
  const userTotalScore = userData.monthlyData.reduce(
    (sum, monthData) => sum + monthData.contributionScore,
    0
  );

  // Calculate percentage relative to all users' total contribution score
  const percentage =
    totalContributionScore > 0
      ? (userTotalScore / totalContributionScore) * 100
      : 0;

  // Build display string: XX S, XX A, XX B, XX C = Total CP - XX%
  const levelCounts = [
    {
      level: IssueLevel.level_S,
      label: "S",
      count: userData.monthlyData.reduce(
        (sum, monthData) => sum + monthData.levelCounts[IssueLevel.level_S],
        0
      ),
    },
    {
      level: IssueLevel.level_A,
      label: "A",
      count: userData.monthlyData.reduce(
        (sum, monthData) => sum + monthData.levelCounts[IssueLevel.level_A],
        0
      ),
    },
    {
      level: IssueLevel.level_B,
      label: "B",
      count: userData.monthlyData.reduce(
        (sum, monthData) => sum + monthData.levelCounts[IssueLevel.level_B],
        0
      ),
    },
    {
      level: IssueLevel.level_C,
      label: "C",
      count: userData.monthlyData.reduce(
        (sum, monthData) => sum + monthData.levelCounts[IssueLevel.level_C],
        0
      ),
    },
  ];

  const levelCountsDisplay = levelCounts
    .filter((item) => item.count > 0) // Only show levels with count > 0
    .map((item) => `${item.count} ${item.label}`)
    .join(", ");

  return (
    <div>
      <div className="text-3xl font-normal text-gray-900 dark:text-gray-100">
        {userTotalScore} CP - {percentage.toFixed(1)}%
      </div>
      <div className="text-sm text-gray-900 dark:text-gray-100">
        {levelCountsDisplay}
      </div>
    </div>
  );
}
