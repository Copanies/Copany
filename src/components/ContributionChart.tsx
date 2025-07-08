"use client";
import { useMemo, useRef, useEffect, useState } from "react";
import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { LinePath } from "@visx/shape";
import { scaleLinear, scaleBand, scaleOrdinal } from "@visx/scale";
import { AxisBottom, AxisLeft, AxisRight } from "@visx/axis";
import {
  Contribution,
  IssueLevel,
  AssigneeUser,
  LEVEL_SCORES,
} from "@/types/database.types";

// 定义显示的等级类型（排除 level_None）
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
  globalMaxScore: number; // 改为必需参数
  monthRange: MonthRange;
}

// 月份简写
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

// 等级颜色
const levelColors: Record<DisplayLevel, string> = {
  [IssueLevel.level_C]: "#16a34a", // green
  [IssueLevel.level_B]: "#ea580c", // orange
  [IssueLevel.level_A]: "#dc2626", // red
  [IssueLevel.level_S]: "#9333ea", // purple
};

// 等级标签
const levelLabels: Record<DisplayLevel, string> = {
  [IssueLevel.level_C]: "C级",
  [IssueLevel.level_B]: "B级",
  [IssueLevel.level_A]: "A级",
  [IssueLevel.level_S]: "S级",
};

// 等级分数（仅用于显示图例）
const levelScores: Record<DisplayLevel, number> = {
  [IssueLevel.level_C]: LEVEL_SCORES[IssueLevel.level_C],
  [IssueLevel.level_B]: LEVEL_SCORES[IssueLevel.level_B],
  [IssueLevel.level_A]: LEVEL_SCORES[IssueLevel.level_A],
  [IssueLevel.level_S]: LEVEL_SCORES[IssueLevel.level_S],
};

// 显示的等级列表
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
}: ContributionChartProps) {
  // 处理数据：按月份和等级统计
  const userContributionData = useMemo(() => {
    const monthlyData: ContributionData[] = [];

    // 根据 monthRange 生成月份列表
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

    // 统计贡献数据（现在只需要计算本地数据，不需要分数计算）
    contributions.forEach((contribution) => {
      const contributionYear = contribution.year;
      const contributionMonth = contribution.month;
      const level = contribution.issue_level;

      // 找到对应的月份数据
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
        // 计算贡献分（用于本地折线图显示）
        monthlyData[monthDataIndex].contributionScore +=
          levelScores[displayLevel];
      }
    });

    return {
      user,
      monthlyData,
    };
  }, [contributions, user, monthRange]);

  // 如果没有传入globalMaxCount，则计算本地最大值作为fallback
  const effectiveMaxCount =
    globalMaxCount ??
    Math.max(
      ...userContributionData.monthlyData.map((monthData) => monthData.total),
      1 // 确保至少为1
    );

  // 检查是否有贡献数据
  const hasData = userContributionData.monthlyData.some(
    (monthData) => monthData.total > 0
  );

  if (!hasData) {
    return (
      <div className="w-full">
        <div className="text-center text-gray-500 py-8">
          {user.name} 暂无贡献数据
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
      />
    </div>
  );
}

interface UserChartProps {
  userData: UserContributionData;
  globalMaxCount: number;
  globalMaxScore: number;
}

function UserChart({
  userData,
  globalMaxCount,
  globalMaxScore,
}: UserChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

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

  const height = 300;
  const margin = { top: 80, right: 80, bottom: 40, left: 60 }; // 增加右边距为折线图Y轴留空间
  const chartWidth = containerWidth - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // 柱状图Y轴 - 使用全局最大值作为Y轴范围
  const yScale = scaleLinear<number>({
    range: [chartHeight, 0],
    domain: [0, globalMaxCount],
  });

  // 折线图Y轴 - 贡献分，使用全局最大值确保所有图表刻度一致
  const yScoreScale = scaleLinear<number>({
    range: [chartHeight, 0],
    domain: [0, globalMaxScore],
  });

  const xScale = scaleBand<string>({
    range: [0, chartWidth],
    domain: userData.monthlyData.map((d) => d.month),
    padding: 0.2,
  });

  // 为折线图准备数据点
  const lineData = userData.monthlyData.map((monthData, index) => ({
    x: (xScale(monthData.month) || 0) + xScale.bandwidth() / 2, // 柱子中心位置
    y: yScoreScale(monthData.contributionScore),
    score: monthData.contributionScore,
  }));

  return (
    <div ref={containerRef} style={{ marginBottom: "40px", width: "100%" }}>
      {/* 用户信息 */}
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}
      >
        <img
          src={userData.user.avatar_url}
          alt={userData.user.name}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            marginRight: "10px",
          }}
        />
        <div>
          <div style={{ fontWeight: "bold" }}>{userData.user.name}</div>
          <div style={{ fontSize: "14px", color: "#666" }}>
            {userData.user.email}
          </div>
        </div>
      </div>

      {/* 图表 */}
      <svg width={containerWidth} height={height}>
        <Group left={margin.left} top={margin.top}>
          {/* 绘制堆叠柱状图 */}
          {userData.monthlyData.map((monthData) => {
            const monthX = xScale(monthData.month) || 0;
            const barWidth = xScale.bandwidth();

            if (monthData.total === 0) return null;

            let cumulativeHeight = 0;

            return displayLevels.map((level) => {
              const count = monthData.levelCounts[level];

              if (count === 0) return null;

              const segmentHeight =
                (count / monthData.total) *
                (chartHeight - yScale(monthData.total));
              const barY = yScale(monthData.total) + cumulativeHeight;

              cumulativeHeight += segmentHeight;

              return (
                <Bar
                  key={`${monthData.month}-${level}`}
                  x={monthX}
                  y={barY}
                  width={barWidth}
                  height={segmentHeight}
                  fill={levelColors[level]}
                />
              );
            });
          })}

          {/* 绘制贡献分折线图 */}
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

          {/* 绘制折线图的数据点 */}
          {lineData.map((point, index) => (
            <circle
              key={`point-${index}`}
              cx={point.x}
              cy={point.y}
              r={4}
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth={2}
            />
          ))}

          {/* X轴 */}
          <AxisBottom
            top={chartHeight}
            scale={xScale}
            tickFormat={(value, index) => {
              // 找到对应的月份数据
              const monthData = userData.monthlyData.find(
                (d) => d.month === value
              );
              if (!monthData) return value;

              // 如果是第一个月，或者年份与前一个月不同，则显示年份
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
          />

          {/* 左Y轴 - Issue数量 */}
          <AxisLeft
            scale={yScale}
            numTicks={Math.min(globalMaxCount || 1, 10)}
            tickFormat={(value) =>
              Number.isInteger(Number(value)) ? value.toString() : ""
            }
            label="Issue 数量"
            labelProps={{
              fontSize: 12,
              textAnchor: "middle",
              transform: "rotate(-90)",
            }}
          />

          {/* 右Y轴 - 贡献分 */}
          <AxisRight
            left={chartWidth}
            scale={yScoreScale}
            numTicks={Math.min(globalMaxScore || 1, 10)}
            tickFormat={(value) =>
              Number.isInteger(Number(value)) ? value.toString() : ""
            }
            label="贡献分"
            labelProps={{
              fontSize: 12,
              textAnchor: "middle",
              transform: "rotate(90)",
            }}
          />
        </Group>
      </svg>

      {/* 图例 */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginTop: "10px",
          flexWrap: "wrap",
        }}
      >
        {/* Issue等级图例 */}
        {displayLevels.map((level) => (
          <div
            key={level}
            style={{ display: "flex", alignItems: "center", gap: "5px" }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: levelColors[level],
              }}
            />
            <span style={{ fontSize: "14px" }}>
              {levelLabels[level]} ({levelScores[level]}分)
            </span>
          </div>
        ))}
        {/* 贡献分折线图例 */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div
            style={{
              width: "16px",
              height: "3px",
              backgroundColor: "#2563eb",
            }}
          />
          <span style={{ fontSize: "14px" }}>贡献分</span>
        </div>
      </div>
    </div>
  );
}
