"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { generateContributionsFromIssuesAction } from "@/actions/contribution.actions";
import {
  Contribution,
  IssueLevel,
  AssigneeUser,
  CopanyContributor,
  LEVEL_SCORES,
} from "@/types/database.types";
import { contributionsManager, contributorsManager } from "@/utils/cache";
import LoadingView from "@/components/commons/LoadingView";
import ContributionChart from "@/components/ContributionChart";
import ContributionPieChart from "@/components/ContributionPieChart";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { ChartPieIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface ContributionViewProps {
  copanyId: string;
}

export default function ContributionView({ copanyId }: ContributionViewProps) {
  const router = useRouter();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contributors, setContributors] = useState<CopanyContributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(
    async (forceRefresh: boolean = false) => {
      try {
        setIsLoading(true);

        const contributionDataPromise = forceRefresh
          ? contributionsManager.refreshContributions(copanyId, () =>
              generateContributionsFromIssuesAction(copanyId)
            )
          : contributionsManager.getContributions(copanyId, () =>
              generateContributionsFromIssuesAction(copanyId)
            );

        const contributorDataPromise =
          contributorsManager.getContributors(copanyId);

        // 并行执行请求
        const [newContributionData, newContributorData] = await Promise.all([
          contributionDataPromise,
          contributorDataPromise,
        ]);

        setContributions(newContributionData);
        setContributors(newContributorData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [copanyId]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 将 contributors 转换为 AssigneeUser 格式
  const users: AssigneeUser[] = contributors.map((contributor) => ({
    id: contributor.user_id,
    name: contributor.name,
    email: contributor.email,
    avatar_url: contributor.avatar_url,
  }));

  // 计算每个用户的总贡献值并排序
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
      .sort((a, b) => b.totalScore - a.totalScore) // 按总贡献值降序排序
      .map((item, index) => ({
        ...item,
        rank: index + 1, // 添加排名
      }));
  }, [users, contributions]);

  // 计算 globalMaxCount、globalMaxScore 和月份范围
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

      // 找到最早和最晚的年月
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

      // 创建用户月度统计数据结构
      const userMonthlyData: {
        [userId: string]: {
          [yearMonth: string]: {
            counts: { [level: number]: number };
            totalCount: number;
            totalScore: number;
          };
        };
      } = {};

      // 初始化数据结构
      users.forEach((user) => {
        userMonthlyData[user.id] = {};

        // 遍历从最早到最晚的所有月份
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

      // 统计贡献数据
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

      // 直接从贡献数据计算最大值，确保包含所有贡献
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

      // 找到最大值
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

  // 检查是否有贡献数据
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
        description="By completing Issues, members earn contribution points. When the product becomes profitable, revenue will be distributed based on each member’s share of contributions."
        buttonIcon={<ArrowUpRightIcon className="w-4 h-4" />}
        buttonTitle="View issues"
        buttonAction={() => {
          router.push(`/copany/${copanyId}?tab=Cooperate`);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 mb-8">
      <div className="flex flex-col w-full gap-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Distribution
        </h3>
        <div className="flex w-full items-center justify-center pb-4 border-b border-gray-200 dark:border-gray-700">
          <ContributionPieChart contributions={contributions} users={users} />
        </div>
      </div>

      <div>
        <div className="flex flex-col md:flex-row gap-6">
          {usersWithContribution.map((userItem) => (
            <div className="w-full md:w-1/2" key={userItem.user.id}>
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
