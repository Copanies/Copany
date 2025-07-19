"use client";
import { useMemo, useRef } from "react";
import Image from "next/image";
import { Group } from "@visx/group";
import { Pie } from "@visx/shape";
import { scaleOrdinal } from "@visx/scale";
import { useTooltip } from "@visx/tooltip";
import {
  Contribution,
  IssueLevel,
  AssigneeUser,
  LEVEL_SCORES,
} from "@/types/database.types";
import { useDarkMode } from "@/utils/useDarkMode";

interface UserContributionData {
  user: AssigneeUser;
  totalScore: number;
  percentage: number;
  levelCounts: Record<IssueLevel, number>;
}

interface TooltipData {
  user: AssigneeUser;
  totalScore: number;
  percentage: number;
  levelCounts: Record<IssueLevel, number>;
}

interface ContributionPieChartProps {
  contributions: Contribution[];
  users: AssigneeUser[];
}

// Color configuration - now with light/dark mode support
const lightColors = [
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
  "#8b5cf6", // violet (repeat)
  "#f97316", // orange
  "#84cc16", // lime
  "#ec4899", // pink
];

const darkColors = [
  "#A78BFA", // violet-400 - more vibrant
  "#22D3EE", // cyan-400 - more vibrant
  "#34D399", // emerald-400 - more vibrant
  "#FBBF24", // amber-400 - more vibrant
  "#F87171", // red-400 - more vibrant
  "#60A5FA", // blue-400 - more vibrant
  "#C084FC", // violet-300 - even more vibrant for repeat
  "#FB923C", // orange-400 - more vibrant
  "#A3E635", // lime-400 - more vibrant
  "#F472B6", // pink-400 - more vibrant
];

// Level colors (same as ContributionChart) - now with light/dark mode support
const levelColors: Record<IssueLevel, { light: string; dark: string }> = {
  [IssueLevel.level_C]: { light: "#7987FF", dark: "#60A5FA" }, // blue - more vibrant in dark
  [IssueLevel.level_B]: { light: "#E697FF", dark: "#A78BFA" }, // purple - more vibrant
  [IssueLevel.level_A]: { light: "#FFA5CB", dark: "#F472B6" }, // pink - more vibrant
  [IssueLevel.level_S]: { light: "#FFE372", dark: "#FBBF24" }, // yellow - more vibrant
  [IssueLevel.level_None]: { light: "#E5E7EB", dark: "#6B7280" }, // gray - lighter in dark mode
};

// Note: levelLabels removed as it was unused

export default function ContributionPieChart({
  contributions,
  users,
}: ContributionPieChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Calculate each user's contribution score and level breakdown
  const userContributionData: UserContributionData[] = useMemo(() => {
    // Count each user's contribution score and level breakdown
    const userScores: { [userId: string]: number } = {};
    const userLevelCounts: { [userId: string]: Record<IssueLevel, number> } =
      {};

    // Initialize all users' scores and level counts to 0
    users.forEach((user) => {
      userScores[user.id] = 0;
      userLevelCounts[user.id] = {
        [IssueLevel.level_S]: 0,
        [IssueLevel.level_A]: 0,
        [IssueLevel.level_B]: 0,
        [IssueLevel.level_C]: 0,
        [IssueLevel.level_None]: 0,
      };
    });

    // Accumulate each user's contribution score and level counts
    contributions.forEach((contribution) => {
      const userId = contribution.user_id;
      const level = contribution.issue_level as IssueLevel;
      const score = LEVEL_SCORES[level] || 0;

      if (userScores.hasOwnProperty(userId)) {
        userScores[userId] += score;
        userLevelCounts[userId][level]++;
      }
    });

    // Calculate total score
    const totalScore = Object.values(userScores).reduce(
      (sum, score) => sum + score,
      0
    );

    // If total score is 0, return empty array
    if (totalScore === 0) {
      return [];
    }

    // Convert to required format and calculate percentage
    const data = users
      .map((user) => ({
        user,
        totalScore: userScores[user.id],
        percentage: (userScores[user.id] / totalScore) * 100,
        levelCounts: userLevelCounts[user.id],
      }))
      .filter((item) => item.totalScore > 0) // Only show users with contributions
      .sort((a, b) => b.totalScore - a.totalScore); // Sort by contribution score in descending order

    return data;
  }, [contributions, users]);

  // Color scale - choose colors based on theme
  const colorScale = scaleOrdinal<string, string>({
    domain: userContributionData.map((d) => d.user.id),
    range: isDarkMode ? darkColors : lightColors,
  });

  const maxWidth = 600;
  const width = Math.min(400, maxWidth);
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const radius =
    Math.min(width, height) / 2 - Math.max(...Object.values(margin));

  // Handle mouse events for tooltip
  const handleArcMouseEnter = (
    event: React.MouseEvent<SVGPathElement>,
    data: UserContributionData
  ) => {
    const tooltipData: TooltipData = {
      user: data.user,
      totalScore: data.totalScore,
      percentage: data.percentage,
      levelCounts: data.levelCounts,
    };

    // Calculate tooltip position, ensuring it stays within window bounds
    const tooltipWidth = 280;
    const tooltipHeight = 200;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let tooltipLeft = event.clientX;
    let tooltipTop = event.clientY - tooltipHeight - 12;

    // Horizontal boundary detection
    if (tooltipLeft + tooltipWidth > viewportWidth) {
      tooltipLeft = event.clientX - tooltipWidth;
    }
    if (tooltipLeft < 0) {
      tooltipLeft = 12;
    }

    // Vertical boundary detection
    if (tooltipTop < 0) {
      tooltipTop = event.clientY + 12;
    }
    if (tooltipTop + tooltipHeight > viewportHeight) {
      tooltipTop = viewportHeight - tooltipHeight - 12;
    }

    showTooltip({
      tooltipData,
      tooltipLeft,
      tooltipTop,
    });
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  // If no data, show empty state
  if (userContributionData.length === 0) {
    return (
      <div className="w-full max-w-4xl">
        <div className="flex justify-center items-center h-64 text-gray-500 dark:text-gray-400">
          No contribution data available
        </div>
      </div>
    );
  }

  // Filter and format level counts for display
  const levelDisplay = tooltipData
    ? [
        {
          level: IssueLevel.level_S,
          label: "S",
          count: tooltipData.levelCounts[IssueLevel.level_S],
        },
        {
          level: IssueLevel.level_A,
          label: "A",
          count: tooltipData.levelCounts[IssueLevel.level_A],
        },
        {
          level: IssueLevel.level_B,
          label: "B",
          count: tooltipData.levelCounts[IssueLevel.level_B],
        },
        {
          level: IssueLevel.level_C,
          label: "C",
          count: tooltipData.levelCounts[IssueLevel.level_C],
        },
      ].filter((item) => item.count > 0)
    : [];

  const getLevelColor = (level: IssueLevel) =>
    isDarkMode ? levelColors[level].dark : levelColors[level].light;

  return (
    <div ref={containerRef} className="w-full max-w-4xl relative">
      <div className="flex flex-col lg:flex-row items-center gap-8 justify-center">
        {/* Pie chart */}
        <div className="flex-shrink-0">
          <svg width={width} height={height}>
            <Group top={height / 2} left={width / 2}>
              <Pie
                data={userContributionData}
                pieValue={(d) => d.totalScore}
                outerRadius={radius}
                innerRadius={radius * 0.4} // Donut chart
              >
                {(pie) => {
                  return pie.arcs.map((arc) => {
                    const [centroidX, centroidY] = pie.path.centroid(arc);
                    const hasSpaceForLabel =
                      arc.endAngle - arc.startAngle >= 0.1;
                    const arcPath = pie.path(arc) || "";

                    return (
                      <Group key={`arc-${arc.data.user.id}`}>
                        <path
                          d={arcPath}
                          fill={colorScale(arc.data.user.id)}
                          stroke={isDarkMode ? "#111827" : "white"} // gray-900 : white - darker stroke for better contrast
                          strokeWidth={isDarkMode ? 3 : 2} // thicker stroke in dark mode
                          style={{ cursor: "pointer" }}
                          onMouseEnter={(event) =>
                            handleArcMouseEnter(event, arc.data)
                          }
                          onMouseLeave={handleMouseLeave}
                        />
                        {hasSpaceForLabel && (
                          <text
                            x={centroidX}
                            y={centroidY}
                            dy="0.33em"
                            fontSize={12}
                            textAnchor="middle"
                            fill={isDarkMode ? "#111827" : "white"} // gray-900 : white - darker text for better contrast
                            fontWeight="bold"
                            style={{ pointerEvents: "none" }}
                          >
                            {arc.data.percentage.toFixed(1)}%
                          </text>
                        )}
                      </Group>
                    );
                  });
                }}
              </Pie>
            </Group>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          {userContributionData.map((data) => (
            <div key={data.user.id} className="flex items-center gap-3 min-w-0">
              {/* Color block */}
              <div
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ backgroundColor: colorScale(data.user.id) }}
              />

              {/* User information */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Image
                  src={data.user.avatar_url}
                  alt={data.user.name}
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">
                    {data.user.name}
                  </div>
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {data.totalScore} P - {data.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 text-sm"
        >
          {/* User info */}
          <div className="flex items-center gap-2 mb-3">
            <Image
              src={tooltipData.user.avatar_url}
              alt={tooltipData.user.name}
              width={24}
              height={24}
              className="w-6 h-6 rounded-full"
            />
            <div className="flex flex-col gap-0">
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {tooltipData.user.name}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {tooltipData.user.email}
              </div>
            </div>
          </div>

          {/* Total contribution */}
          <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {tooltipData.totalScore} Points
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {tooltipData.percentage.toFixed(1)}% of total contributions
            </div>
          </div>

          {/* Level breakdown */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Issue Level Breakdown:
            </div>
            {levelDisplay.map((item) => (
              <div
                key={item.level}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getLevelColor(item.level) }}
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    Level {item.label}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.count} × {LEVEL_SCORES[item.level]} P ={" "}
                  {item.count * LEVEL_SCORES[item.level]} P
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
