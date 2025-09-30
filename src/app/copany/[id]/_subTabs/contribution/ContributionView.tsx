"use client";
import { Suspense } from "react";
import { useMemo } from "react";
import { IssueLevel, AssigneeUser, LEVEL_SCORES } from "@/types/database.types";
import { useContributions } from "@/hooks/activity";
import { useContributors } from "@/hooks/contributors";
import LoadingView from "@/components/commons/LoadingView";
import ContributionChart from "@/app/copany/[id]/_subTabs/contribution/ContributionChart";
import ContributionPieChart from "@/app/copany/[id]/_subTabs/contribution/ContributionPieChart";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { ChartPieIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import {
  EMPTY_CONTRIBUTORS_ARRAY,
  EMPTY_CONTRIBUTION_ARRAY,
} from "@/utils/constants";

interface ContributionViewProps {
  copanyId: string;
}

export default function ContributionView({ copanyId }: ContributionViewProps) {
  const router = useRouter();

  // 使用 React Query hooks 替代 cacheManager
  const {
    data: contributions = EMPTY_CONTRIBUTION_ARRAY,
    isLoading: isContributionsLoading,
  } = useContributions(copanyId);
  const {
    data: contributors = EMPTY_CONTRIBUTORS_ARRAY,
    isLoading: isContributorsLoading,
  } = useContributors(copanyId);

  const isLoading = isContributionsLoading || isContributorsLoading;

  // Convert contributors to AssigneeUser format
  const users: AssigneeUser[] = useMemo(() => {
    return contributors.map((contributor) => ({
      id: contributor.user_id,
      name: contributor.name,
      email: contributor.email,
      avatar_url: contributor.avatar_url,
    }));
  }, [contributors]);

  // Calculate total contribution value for each user and sort
  const usersWithContribution = useMemo(() => {
    return users
      .map((user) => {
        const userContributions = contributions.filter(
          (c) => c.user_id === user.id
        );
        const totalScore = userContributions.reduce((sum, contribution) => {
          const level = contribution.issue_level;
          if (
            [
              IssueLevel.level_C,
              IssueLevel.level_B,
              IssueLevel.level_A,
              IssueLevel.level_S,
            ].includes(level)
          ) {
            return sum + (LEVEL_SCORES[level as IssueLevel] || 0);
          }
          return sum;
        }, 0);

        return {
          user,
          totalScore,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore) // Sort by total contribution value in descending order
      .map((item, index) => ({
        ...item,
        rank: index + 1, // Add rank
      }));
  }, [users, contributions]);

  // Calculate globalMaxCount, globalMaxScore and month range
  const { globalMaxCount, globalMaxScore, monthRange, totalContributionScore } =
    useMemo(() => {
      if (contributions.length === 0) {
        return {
          globalMaxCount: 1,
          globalMaxScore: 1,
          monthRange: {
            startYear: new Date().getFullYear(),
            startMonth: 1,
            endYear: new Date().getFullYear(),
            endMonth: 12,
          },
          totalContributionScore: 0,
        };
      }

      // Find earliest and latest year and month
      let earliestYear = Infinity;
      let earliestMonth = Infinity;
      let latestYear = -Infinity;
      let latestMonth = -Infinity;

      contributions.forEach((contribution) => {
        if (
          contribution.year < earliestYear ||
          (contribution.year === earliestYear &&
            contribution.month < earliestMonth)
        ) {
          earliestYear = contribution.year;
          earliestMonth = contribution.month;
        }
        if (
          contribution.year > latestYear ||
          (contribution.year === latestYear && contribution.month > latestMonth)
        ) {
          latestYear = contribution.year;
          latestMonth = contribution.month;
        }
      });

      // Create user monthly statistics data structure
      const userMonthlyData: {
        [userId: string]: {
          [yearMonth: string]: {
            counts: { [level: number]: number };
            totalCount: number;
            totalScore: number;
          };
        };
      } = {};

      // Initialize data structure
      users.forEach((user) => {
        userMonthlyData[user.id] = {};

        // Iterate through all months from earliest to latest
        for (let year = earliestYear; year <= latestYear; year++) {
          const startMonth = year === earliestYear ? earliestMonth : 1;
          const endMonth = year === latestYear ? latestMonth : 12;

          for (let month = startMonth; month <= endMonth; month++) {
            const yearMonth = `${year}-${month}`;
            userMonthlyData[user.id][yearMonth] = {
              counts: {
                [IssueLevel.level_C]: 0,
                [IssueLevel.level_B]: 0,
                [IssueLevel.level_A]: 0,
                [IssueLevel.level_S]: 0,
              },
              totalCount: 0,
              totalScore: 0,
            };
          }
        }
      });

      // Count contribution data
      contributions.forEach((contribution) => {
        const userId = contribution.user_id;
        const yearMonth = `${contribution.year}-${contribution.month}`;
        const level = contribution.issue_level;

        if (
          userMonthlyData[userId] &&
          userMonthlyData[userId][yearMonth] &&
          [
            IssueLevel.level_C,
            IssueLevel.level_B,
            IssueLevel.level_A,
            IssueLevel.level_S,
          ].includes(level)
        ) {
          userMonthlyData[userId][yearMonth].counts[level]++;
          userMonthlyData[userId][yearMonth].totalCount++;
          userMonthlyData[userId][yearMonth].totalScore +=
            LEVEL_SCORES[level as IssueLevel] || 0;
        }
      });

      // Calculate maximum values directly from contribution data, ensuring all contributions are included
      const allUserMonthScores: { [userMonth: string]: number } = {};
      const allUserMonthCounts: { [userMonth: string]: number } = {};

      contributions.forEach((contribution) => {
        const userId = contribution.user_id;
        const yearMonth = `${contribution.year}-${contribution.month}`;
        const level = contribution.issue_level;
        const userMonth = `${userId}-${yearMonth}`;

        if (
          [
            IssueLevel.level_C,
            IssueLevel.level_B,
            IssueLevel.level_A,
            IssueLevel.level_S,
          ].includes(level)
        ) {
          allUserMonthScores[userMonth] =
            (allUserMonthScores[userMonth] || 0) +
            (LEVEL_SCORES[level as IssueLevel] || 0);
          allUserMonthCounts[userMonth] =
            (allUserMonthCounts[userMonth] || 0) + 1;
        }
      });

      // Find maximum values
      const maxCount = Math.max(...Object.values(allUserMonthCounts), 1);
      const maxScore = Math.max(...Object.values(allUserMonthScores), 1);
      const totalScore = Object.values(allUserMonthScores).reduce(
        (sum, score) => sum + score,
        0
      );

      return {
        globalMaxCount: maxCount,
        globalMaxScore: maxScore,
        totalContributionScore: totalScore,
        monthRange: {
          startYear: earliestYear,
          startMonth: earliestMonth,
          endYear: latestYear,
          endMonth: latestMonth,
        },
      };
    }, [contributions, users]);

  if (isLoading) {
    return <LoadingView type="label" />;
  }

  // Check if there is contribution data
  if (contributions.length === 0) {
    return (
      <EmptyPlaceholderView
        icon={
          <ChartPieIcon
            className="w-16 h-16 text-gray-500 dark:text-gray-400"
            strokeWidth={1}
          />
        }
        title="No contribution yet"
        description="By completing Issues, members earn contribution points. When the product becomes profitable, revenue will be distributed based on each member's share of contributions."
        buttonIcon={<ArrowUpRightIcon className="w-4 h-4" />}
        buttonTitle="View issues"
        buttonAction={() => {
          router.push(`/copany/${copanyId}?tab=Cooperate`);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 mb-8 px-0 md:px-5">
      <div className="flex flex-col w-full gap-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Distribution
        </h3>
        <div className="flex w-full items-center justify-center pb-4 border-b border-gray-200 dark:border-gray-700">
          <Suspense
            fallback={<LoadingView type="label" label="Loading pie chart..." />}
          >
            <ContributionPieChart contributions={contributions} users={users} />
          </Suspense>
        </div>
      </div>

      <div>
        <div className="flex flex-col md:flex-row gap-6">
          {usersWithContribution.map((userItem) => (
            <div className="w-full md:w-1/2" key={userItem.user.id}>
              <Suspense
                fallback={<LoadingView type="label" label="Loading chart..." />}
              >
                <ContributionChart
                  contributions={contributions.filter(
                    (c) => c.user_id === userItem.user.id
                  )}
                  user={userItem.user}
                  globalMaxCount={globalMaxCount}
                  globalMaxScore={globalMaxScore}
                  monthRange={monthRange}
                  totalContributionScore={totalContributionScore}
                  rank={userItem.rank}
                />
              </Suspense>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
