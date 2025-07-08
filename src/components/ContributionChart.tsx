"use client";
import { useMemo, useRef, useEffect, useState } from "react";
import Image from "next/image";
import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { LinePath } from "@visx/shape";
import { scaleLinear, scaleBand } from "@visx/scale";
import { AxisBottom, AxisLeft, AxisRight } from "@visx/axis";
import {
  Contribution,
  IssueLevel,
  AssigneeUser,
  LEVEL_SCORES,
} from "@/types/database.types";

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
  x: number;
  y: number;
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

// Level colors
const levelColors: Record<DisplayLevel, string> = {
  [IssueLevel.level_C]: "#7987FF", // blue
  [IssueLevel.level_B]: "#E697FF", // purple
  [IssueLevel.level_A]: "#FFA5CB", // pink
  [IssueLevel.level_S]: "#FFE372", // yellow
};

const levelStrokeColors: Record<DisplayLevel, string> = {
  [IssueLevel.level_C]: "#165BAA", // blue
  [IssueLevel.level_B]: "#A155B9", // purple
  [IssueLevel.level_A]: "#F765A3", // red
  [IssueLevel.level_S]: "#E6B800", // yellow
};

// Level labels
const levelLabels: Record<DisplayLevel, string> = {
  [IssueLevel.level_C]: "C",
  [IssueLevel.level_B]: "B",
  [IssueLevel.level_A]: "A",
  [IssueLevel.level_S]: "S",
};

// Level scores (for legend display only)
const levelScores: Record<DisplayLevel, number> = {
  [IssueLevel.level_C]: LEVEL_SCORES[IssueLevel.level_C],
  [IssueLevel.level_B]: LEVEL_SCORES[IssueLevel.level_B],
  [IssueLevel.level_A]: LEVEL_SCORES[IssueLevel.level_A],
  [IssueLevel.level_S]: LEVEL_SCORES[IssueLevel.level_S],
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

    // Calculate contribution data (only need local data calculation now)
    contributions.forEach((contribution) => {
      const contributionYear = contribution.year;
      const contributionMonth = contribution.month;
      const level = contribution.issue_level;

      // Find corresponding month data
      const monthDataIndex = monthlyData.findIndex(
        (data) =>
          data.year === contributionYear &&
          monthNames[contributionMonth - 1] === data.month
      );

      if (
        monthDataIndex !== -1 &&
        displayLevels.includes(level as DisplayLevel)
      ) {
        const displayLevel = level as DisplayLevel;
        monthlyData[monthDataIndex].levelCounts[displayLevel]++;
        monthlyData[monthDataIndex].total++;
        // Calculate contribution points (for local line chart display)
        monthlyData[monthDataIndex].contributionScore +=
          levelScores[displayLevel];
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
        <div className="text-center text-gray-500 py-8">
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
}

function UserChart({
  userData,
  globalMaxCount,
  globalMaxScore,
  showUserInfo,
  totalContributionScore,
  rank,
}: UserChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);

    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const height = 200;
  const margin = { top: 32, right: 32, bottom: 32, left: 32 }; // Increase right margin for line chart Y-axis
  const chartWidth = containerWidth - margin.left - margin.right;
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

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setTooltip({
      type: "bar",
      month: monthData.month,
      year: monthData.year,
      level,
      count,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const handleLinePointMouseEnter = (
    event: React.MouseEvent<SVGCircleElement>,
    monthData: ContributionData
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setTooltip({
      type: "line",
      month: monthData.month,
      year: monthData.year,
      contributionScore: monthData.contributionScore,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

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
                <div className="font-bold">{userData.user.name}</div>
              </div>
            </div>

            {/* Rank display in top-right corner */}
            {rank !== undefined && (
              <div className="text-sm font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-[2px]">
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
              stroke="#E7E7E7"
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
            tickStroke="#E7E7E7"
            stroke="#E7E7E7"
          />

          {/* Left Y-axis - Issue Count */}
          <AxisLeft
            scale={yScaleAdjusted}
            tickValues={leftYTickValues}
            tickFormat={(value) =>
              Number.isInteger(Number(value)) ? value.toString() : ""
            }
            tickStroke="#E7E7E7"
            stroke="#E7E7E7"
          />

          {/* Right Y-axis - Contribution Points */}
          <AxisRight
            left={chartWidth}
            scale={yScoreScaleAdjusted}
            tickValues={rightYTickValues}
            tickFormat={(value) =>
              Number.isInteger(Number(value)) ? value.toString() : ""
            }
            tickStroke="#E7E7E7"
            stroke="#E7E7E7"
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
                  fill={levelColors[level]}
                  stroke={levelStrokeColors[level]}
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
              stroke="#2563eb"
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
                r={4}
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth={2}
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
      {tooltip && (
        <Tooltip
          data={tooltip}
          containerWidth={containerWidth}
          containerHeight={height}
        />
      )}

      {/* Legend */}
      <div className="flex flex-row mt-2 gap-3 justify-between font-semibold text-xs">
        <div className="flex gap-3 flex-wrap gap-y-1">
          {/* Issue Level Legend */}
          {displayLevels.map((level) => (
            <div key={level} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: levelColors[level] }}
              />
              <span className="">{levelLabels[level]}</span>
            </div>
          ))}
          {/* Contribution Points Line Legend */}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-blue-600" />
            <span className="">Points</span>
          </div>
        </div>
        <div className="flex gap-3 text-gray-600">
          <div className="">L/Y - Issues</div>
          <div className="">R/Y - Points</div>
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

  // Build display string: XX S, XX A, XX B, XX C = Total Points - XX%
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
      <div className="text-3xl font-normal text-gray-900">
        {userTotalScore} P - {percentage.toFixed(1)}%
      </div>
      <div className="text-sm text-gray-900">{levelCountsDisplay}</div>
    </div>
  );
}

interface TooltipProps {
  data: TooltipData;
  containerWidth: number;
  containerHeight: number;
}

function Tooltip({ data, containerWidth }: TooltipProps) {
  // Calculate tooltip position to prevent overflow
  const tooltipWidth = 200;
  const tooltipHeight = 100;

  let x = data.x + 10;
  let y = data.y - 10;

  // Adjust position if tooltip would overflow
  if (x + tooltipWidth > containerWidth) {
    x = data.x - tooltipWidth - 10;
  }
  if (y - tooltipHeight < 0) {
    y = data.y + 20;
  }

  return (
    <div
      className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm pointer-events-none"
      style={{
        left: x,
        top: y,
        minWidth: "150px",
      }}
    >
      <div className="font-semibold text-gray-900 mb-2">
        {data.month} {data.year}
      </div>

      {data.type === "bar" && data.level && data.count !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: levelColors[data.level] }}
            />
            <span className="font-medium">Level {levelLabels[data.level]}</span>
          </div>
          <div className="text-gray-600">
            Issues:{" "}
            <span className="font-medium text-gray-900">{data.count}</span>
          </div>
          <div className="text-gray-600">
            Points:{" "}
            <span className="font-medium text-gray-900">
              {data.count * levelScores[data.level]}
            </span>
          </div>
        </div>
      )}

      {data.type === "line" && data.contributionScore !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-600" />
            <span className="font-medium">Total Points</span>
          </div>
          <div className="text-gray-600">
            Score:{" "}
            <span className="font-medium text-gray-900">
              {data.contributionScore}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
