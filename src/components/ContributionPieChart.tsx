"use client";
import { useMemo } from "react";
import { Group } from "@visx/group";
import { Pie } from "@visx/shape";
import { scaleOrdinal } from "@visx/scale";
import {
  Contribution,
  IssueLevel,
  AssigneeUser,
  LEVEL_SCORES,
} from "@/types/database.types";

interface UserContributionData {
  user: AssigneeUser;
  totalScore: number;
  percentage: number;
}

interface ContributionPieChartProps {
  contributions: Contribution[];
  users: AssigneeUser[];
}

// Color configuration
const colors = [
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

export default function ContributionPieChart({
  contributions,
  users,
}: ContributionPieChartProps) {
  // Calculate each user's contribution score
  const userContributionData: UserContributionData[] = useMemo(() => {
    // Count each user's contribution score
    const userScores: { [userId: string]: number } = {};

    // Initialize all users' scores to 0
    users.forEach((user) => {
      userScores[user.id] = 0;
    });

    // Accumulate each user's contribution score
    contributions.forEach((contribution) => {
      const userId = contribution.user_id;
      const level = contribution.issue_level as IssueLevel;
      const score = LEVEL_SCORES[level] || 0;

      if (userScores.hasOwnProperty(userId)) {
        userScores[userId] += score;
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
      }))
      .filter((item) => item.totalScore > 0) // Only show users with contributions
      .sort((a, b) => b.totalScore - a.totalScore); // Sort by contribution score in descending order

    return data;
  }, [contributions, users]);

  // Color scale
  const colorScale = scaleOrdinal<string, string>({
    domain: userContributionData.map((d) => d.user.id),
    range: colors,
  });

  const maxWidth = 600;
  const width = Math.min(400, maxWidth);
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const radius =
    Math.min(width, height) / 2 - Math.max(...Object.values(margin));

  // If no data, show empty state
  if (userContributionData.length === 0) {
    return (
      <div className="w-full max-w-4xl">
        <div className="flex justify-center items-center h-64 text-gray-500">
          No contribution data available
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
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
                  return pie.arcs.map((arc, index) => {
                    const [centroidX, centroidY] = pie.path.centroid(arc);
                    const hasSpaceForLabel =
                      arc.endAngle - arc.startAngle >= 0.1;
                    const arcPath = pie.path(arc) || "";

                    return (
                      <Group key={`arc-${arc.data.user.id}`}>
                        <path
                          d={arcPath}
                          fill={colorScale(arc.data.user.id)}
                          stroke="white"
                          strokeWidth={2}
                        />
                        {hasSpaceForLabel && (
                          <text
                            x={centroidX}
                            y={centroidY}
                            dy="0.33em"
                            fontSize={12}
                            textAnchor="middle"
                            fill="white"
                            fontWeight="bold"
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
                <img
                  src={data.user.avatar_url}
                  alt={data.user.name}
                  className="w-6 h-6 rounded-full flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">
                    {data.user.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {data.totalScore}P ({data.percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
