"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
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
  mergedUsers?: UserContributionData[]; // Optional array for merged users
}

interface TooltipData {
  user: AssigneeUser;
  totalScore: number;
  percentage: number;
  levelCounts: Record<IssueLevel, number>;
  mergedUsers?: UserContributionData[]; // Optional array for merged users
}

interface ContributionPieChartProps {
  contributions: Contribution[];
  users: AssigneeUser[];
}

// Light mode colors
const lightColors = [
  "#FFE372", // Yellow (S level base)
  "#FFA5CB", // Pink (A level base)
  "#E697FF", // Purple (B level base)
  "#7987FF", // Blue (C level base)
  "#FFD591", // Light orange (S level extension)
  "#FFB7B7", // Light red (A level extension)
  "#DCA5FF", // Light purple (B level extension)
  "#9EAFFF", // Light blue (C level extension)
  "#FFE0A1", // Apricot (S level extension)
  "#FFC4D8", // Light pink (A level extension)
  "#D3B4FF", // Pale purple (B level extension)
  "#A7C8FF", // Sky blue (C level extension)
];

// Dark mode colors
const darkColors = [
  "#FCD34D", // Yellow (S level base) - 300
  "#F9A8D4", // Pink (A level base) - 300
  "#C4B5FD", // Purple (B level base) - 300
  "#93C5FD", // Blue (C level base) - 300
  "#FDE68A", // Light orange (S level extension) - 200
  "#FBCFE8", // Light red (A level extension) - 200
  "#DDD6FE", // Light purple (B level extension) - 200
  "#BFDBFE", // Light blue (C level extension) - 200
  "#FCE7AA", // Apricot (S level extension) - 200+
  "#FCE7F3", // Light pink (A level extension) - 100
  "#EDE9FE", // Pale purple (B level extension) - 100
  "#DBEAFE", // Sky blue (C level extension) - 100
];

// Stroke colors
const strokeColors = {
  light: [
    "#E6B800", // Yellow stroke (S level base)
    "#F765A3", // Pink stroke (A level base)
    "#A155B9", // Purple stroke (B level base)
    "#165BAA", // Blue stroke (C level base)
    "#E6A23C", // Light orange stroke (S level extension)
    "#E57373", // Light red stroke (A level extension)
    "#BA68C8", // Light purple stroke (B level extension)
    "#64B5F6", // Light blue stroke (C level extension)
    "#E6BA3C", // Apricot stroke (S level extension)
    "#F48FB1", // Light pink stroke (A level extension)
    "#B39DDB", // Pale purple stroke (B level extension)
    "#81D4FA", // Sky blue stroke (C level extension)
  ],
  dark: [
    "#F59E0B", // Yellow stroke (S level base) - 400
    "#F472B6", // Pink stroke (A level base) - 400
    "#A78BFA", // Purple stroke (B level base) - 400
    "#60A5FA", // Blue stroke (C level base) - 400
    "#FBBF24", // Light orange stroke (S level extension) - 400
    "#FB7185", // Light red stroke (A level extension) - 400
    "#C084FC", // Light purple stroke (B level extension) - 400
    "#7DD3FC", // Light blue stroke (C level extension) - 400
    "#FBBF24", // Apricot stroke (S level extension) - 400
    "#FB7185", // Light pink stroke (A level extension) - 400
    "#C084FC", // Pale purple stroke (B level extension) - 400
    "#7DD3FC", // Sky blue stroke (C level extension) - 400
  ],
};

// Level colors (same as ContributionChart)
const levelColors: Record<IssueLevel, { light: string; dark: string }> = {
  [IssueLevel.level_S]: { light: "#FFE372", dark: "#FCD34D" }, // Yellow
  [IssueLevel.level_A]: { light: "#FFA5CB", dark: "#F9A8D4" }, // Pink
  [IssueLevel.level_B]: { light: "#E697FF", dark: "#C4B5FD" }, // Purple
  [IssueLevel.level_C]: { light: "#7987FF", dark: "#93C5FD" }, // Blue
  [IssueLevel.level_None]: { light: "#E5E7EB", dark: "#4B5563" }, // Gray
};

// Note: levelLabels removed as it was unused

export default function ContributionPieChart({
  contributions,
  users,
}: ContributionPieChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);

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

  // Monitor container width changes
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    });

    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    };

    updateWidth();

    if (containerRef.current && containerRef.current.offsetWidth === 0) {
      setTimeout(updateWidth, 0);
      setTimeout(updateWidth, 100);
    }

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

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

  // 在 userContributionData 计算后，添加数据处理逻辑
  const processedData = useMemo(() => {
    const threshold = 5; // 5% 阈值
    const mainContributions = userContributionData.filter(
      (item) => item.percentage >= threshold
    );

    const smallContributions = userContributionData.filter(
      (item) => item.percentage < threshold
    );

    if (smallContributions.length === 0) {
      return userContributionData;
    }

    // 计算小贡献的总和
    const totalSmallScore = smallContributions.reduce(
      (sum, item) => sum + item.totalScore,
      0
    );
    const totalSmallPercentage = smallContributions.reduce(
      (sum, item) => sum + item.percentage,
      0
    );

    // 创建"其他"类别
    const othersData = {
      user: {
        id: "others",
        name: `Others (${smallContributions.length})`,
        email: `Combined ${smallContributions.length} contributions below 5%`,
        avatar_url: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      totalScore: totalSmallScore,
      percentage: totalSmallPercentage,
      levelCounts: smallContributions.reduce((acc, curr) => {
        Object.entries(curr.levelCounts).forEach(([level, count]) => {
          const issueLevel = level as unknown as IssueLevel;
          acc[issueLevel] = (acc[issueLevel] || 0) + count;
        });
        return acc;
      }, {} as Record<IssueLevel, number>),
      mergedUsers: smallContributions, // 保存被合并的用户信息
    };

    return [...mainContributions, othersData];
  }, [userContributionData]);

  // 修改颜色比例尺的数据源
  const colorScale = scaleOrdinal<string, string>({
    domain: processedData.map((d) => d.user.id),
    range: isDarkMode ? darkColors : lightColors,
  });

  // Responsive SVG dimensions based on container width
  const isMobile = containerWidth < 640; // sm breakpoint
  // On very small screens (< 415px), use almost full container width with some padding
  // On mobile (< 640px), cap at 300px
  // On desktop, use 400px
  const maxChartSize = isMobile
    ? Math.min(containerWidth * 0.95, 300) // Use 95% of container width or max 300px
    : Math.min(containerWidth * 0.5, 400); // On desktop, pie chart takes about half the width
  const width = Math.max(Math.min(maxChartSize, 400), 200); // Min 200px, max 400px
  const height = isMobile ? width : 300; // Square on mobile, 300px height on desktop
  const margin = {
    top: isMobile ? 12 : 20,
    right: isMobile ? 12 : 20,
    bottom: isMobile ? 12 : 20,
    left: isMobile ? 12 : 20,
  };
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
    <div ref={containerRef} className="w-full min-w-0 max-w-4xl relative">
      <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8 justify-center min-w-0">
        {/* Pie chart */}
        <div className="flex-shrink-0 min-w-0 flex justify-center">
          <svg width={width} height={height} className="max-w-full">
            <Group top={height / 2} left={width / 2}>
              <Pie
                data={processedData}
                pieValue={(d) => d.totalScore}
                outerRadius={radius}
                innerRadius={radius * 0.4} // Donut chart
                cornerRadius={4} // Add corner radius
                padAngle={0.04} // Increase gap between segments
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
                          stroke={
                            isDarkMode
                              ? strokeColors.dark[
                                  processedData.findIndex(
                                    (d) => d.user.id === arc.data.user.id
                                  ) % strokeColors.dark.length
                                ]
                              : strokeColors.light[
                                  processedData.findIndex(
                                    (d) => d.user.id === arc.data.user.id
                                  ) % strokeColors.light.length
                                ]
                          }
                          strokeWidth={2}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={(event) =>
                            handleArcMouseEnter(event, arc.data)
                          }
                          onMouseLeave={handleMouseLeave}
                        />
                        {hasSpaceForLabel && (
                          <g>
                            <text
                              x={centroidX}
                              y={centroidY - 8} // 向上偏移给排名留出空间
                              dy="0.33em"
                              fontSize={12}
                              textAnchor="middle"
                              fill="#111827"
                              fontWeight="600"
                              style={{
                                pointerEvents: "none",
                                fontFamily:
                                  "-apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                              }}
                            >
                              {arc.data.user.id === "others"
                                ? "Others"
                                : `#${
                                    processedData.findIndex(
                                      (d) => d.user.id === arc.data.user.id
                                    ) + 1
                                  }`}
                            </text>
                            <text
                              x={centroidX}
                              y={centroidY + 8} // 向下偏移给排名留出空间
                              dy="0.33em"
                              fontSize={14}
                              textAnchor="middle"
                              fill="#111827"
                              fontWeight="600"
                              style={{
                                pointerEvents: "none",
                                fontFamily:
                                  "-apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                              }}
                            >
                              {Math.round(arc.data.percentage)}%
                            </text>
                          </g>
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
          {processedData.map((data) => (
            <div key={data.user.id} className="flex items-center gap-3 min-w-0">
              {/* Color block */}
              <div
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ backgroundColor: colorScale(data.user.id) }}
              />

              {/* User information */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {data.user.id === "others" ? (
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {data.mergedUsers?.length}
                    </span>
                  </div>
                ) : (
                  <Image
                    src={data.user.avatar_url}
                    alt={data.user.name}
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded-full flex-shrink-0"
                    placeholder="blur"
                    blurDataURL={shimmerDataUrlWithTheme(24, 24, isDarkMode)}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">
                    {data.user.name}
                  </div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {data.totalScore} P - {Math.round(data.percentage)}%
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
            {tooltipData.user.id === "others" ? (
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {tooltipData.mergedUsers?.length}
                </span>
              </div>
            ) : (
              <Image
                src={tooltipData.user.avatar_url}
                alt={tooltipData.user.name}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full"
                placeholder="blur"
                blurDataURL={shimmerDataUrlWithTheme(24, 24, isDarkMode)}
              />
            )}
            <div className="flex flex-col gap-0">
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {tooltipData.user.name}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {tooltipData.user.id === "others"
                  ? `Combined ${tooltipData.mergedUsers?.length} contributions below 5%`
                  : tooltipData.user.email}
              </div>
            </div>
          </div>

          {/* 如果是合并的数据，显示被合并的用户列表 */}
          {tooltipData.user.id === "others" && tooltipData.mergedUsers && (
            <div className="mb-3 max-h-32 overflow-y-auto">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Included Contributors:
              </div>
              {tooltipData.mergedUsers.map((user) => (
                <div
                  key={user.user.id}
                  className="flex items-center gap-2 py-1 text-sm text-gray-600 dark:text-gray-400"
                >
                  <span>• {user.user.name}</span>
                  <span className="text-gray-500">
                    ({user.totalScore}P - {Math.round(user.percentage)}%)
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Total contribution */}
          <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {tooltipData.totalScore} Points
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(tooltipData.percentage)}% of total contributions
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
