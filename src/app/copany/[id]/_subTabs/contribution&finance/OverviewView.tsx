"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useMemo } from "react";
import {
  IssueLevel,
  AssigneeUser,
  LEVEL_SCORES,
  Contribution,
} from "@/types/database.types";
import { useContributions } from "@/hooks/contributions";
import { useContributors } from "@/hooks/contributors";
import { useUsersInfo } from "@/hooks/userInfo";
import { useTransactions, useAppStoreFinance } from "@/hooks/finance";
import LoadingView from "@/components/commons/LoadingView";
import ContributionChart from "@/components/contribution/ContributionChart";
import FinanceOverviewChart from "@/components/finance/FinanceOverviewChart";
import RevenueHistoryTable from "@/components/finance/RevenueHistoryTable";
import ContributorIncomeTable from "@/components/finance/ContributorIncomeTable";
import { useRouter } from "next/navigation";
import {
  EMPTY_CONTRIBUTORS_ARRAY,
  EMPTY_CONTRIBUTION_ARRAY,
} from "@/utils/constants";
import { getMonthlyPeriod, getMonthlyPeriodSimple } from "@/utils/time";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import Button from "@/components/commons/Button";
import { renderLevelLabel } from "@/components/issue/IssueLevelSelector";
import AddHistoryContributionButton from "@/components/contribution/AddHistoryContributionButton";

interface ContributionOverviewViewProps {
  copanyId: string;
}

// Helper function to format date
function formatDate(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function OverviewView({
  copanyId,
}: ContributionOverviewViewProps) {
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
  const { data: transactions = [] } = useTransactions(copanyId);
  const { data: appStoreFinanceData } = useAppStoreFinance(copanyId);

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

  // Filter contributions with valid level
  const validContributions = useMemo(() => {
    if (!contributions) return [];
    return contributions.filter(
      (contribution) => contribution.issue_level !== IssueLevel.level_None
    );
  }, [contributions]);

  // Get unique user IDs from contributions for user info
  const contributionUserIds = useMemo(() => {
    if (!validContributions || validContributions.length === 0) return [];
    return Array.from(new Set(validContributions.map((c) => c.user_id)));
  }, [validContributions]);

  // Fetch user info for contribution users
  const { data: contributionUsersInfo = {} } =
    useUsersInfo(contributionUserIds);

  // Group all contributions together
  const groupedContributions = useMemo(() => {
    const groups = new Map<
      string,
      {
        period: { start: Date; end: Date; key: string };
        items: Contribution[];
        totalCP: number;
        isEmpty: boolean;
      }
    >();

    if (validContributions && validContributions.length > 0) {
      validContributions.forEach((contribution) => {
        const period = getMonthlyPeriod(
          new Date(contribution.year, contribution.month - 1, 1)
        );
        const key = period.key;

        if (!groups.has(key)) {
          groups.set(key, {
            period,
            items: [],
            totalCP: 0,
            isEmpty: false,
          });
        }

        const group = groups.get(key)!;
        group.items.push(contribution);
        group.totalCP +=
          LEVEL_SCORES[contribution.issue_level as IssueLevel] || 0;
      });
    }

    return Array.from(groups.values()).sort(
      (a, b) => b.period.start.getTime() - a.period.start.getTime()
    );
  }, [validContributions]);

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
      .filter((item) => item.totalScore > 0) // Filter out users with no contribution
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

  // Check if there is revenue data (transactions or App Store finance data)
  const hasRevenueData =
    (transactions && transactions.length > 0) ||
    (appStoreFinanceData?.chartData &&
      appStoreFinanceData.chartData.length > 0);

  return (
    <div className="flex flex-col min-w-0 gap-6 mb-8">
      {/* Finance Chart Section */}
      <div className="flex flex-col w-full gap-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Revenue Trend
        </h3>
        <FinanceOverviewChart
          copanyId={copanyId}
          showLatestRevenue={true}
          showAvgMonthlyRevenue={true}
          showOneYearRevenue={true}
          showAllRevenue={true}
        />
      </div>

      <div className="flex flex-col w-full gap-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Revenue History
        </h3>
        {hasRevenueData ? (
          <RevenueHistoryTable copanyId={copanyId} />
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Revenue history will appear here once transactions are recorded or
            App Store Connect is connected.
          </p>
        )}
      </div>

      <div className="flex flex-col w-full gap-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Contributors Income History
        </h3>
        <ContributorIncomeTable copanyId={copanyId} />
      </div>

      <div className="flex flex-col w-full gap-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Contributors Contribution Points
        </h3>
        {usersWithContribution.length > 0 ? (
          <div className="w-full min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-8 gap-x-6">
              {usersWithContribution.map((userItem) => (
                <div className="min-w-0" key={userItem.user.id}>
                  <Suspense
                    fallback={
                      <LoadingView type="label" label="Loading chart..." />
                    }
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
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            By completing Issues, members earn contribution points. When the
            product becomes profitable, revenue will be distributed based on
            each member's share of contributions.
          </p>
        )}
      </div>

      {/* Contribution Records Section */}
      <div className="flex flex-col w-full gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Contribution Records
          </h3>
          <AddHistoryContributionButton copanyId={copanyId} />
        </div>
        {groupedContributions.length > 0 ? (
          <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {groupedContributions.map((group) => (
              <div key={group.period.key} className="">
                {/* Period Header */}
                <div className="flex h-11 items-center w-full px-3 md:px-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center w-full justify-between">
                    <h3 className="text-sm font-medium">
                      {getMonthlyPeriodSimple(group.period.start)}
                    </h3>
                    <span className="text-sm font-medium">
                      {group.totalCP} CP
                    </span>
                  </div>
                </div>

                {/* Contribution Items */}
                <ContributionRecordsList
                  items={group.items}
                  contributionUsersInfo={contributionUsersInfo}
                  onViewIssue={(issueId) => {
                    router.push(`/copany/${copanyId}/issue/${issueId}`);
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Contribution records will appear here once members complete Issues
            and earn contribution points.
          </p>
        )}
      </div>
    </div>
  );
}

// Contribution records list component
function ContributionRecordsList({
  items,
  contributionUsersInfo,
  onViewIssue,
}: {
  items: Contribution[];
  contributionUsersInfo: Record<string, { name: string; avatar_url: string }>;
  onViewIssue: (issueId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [actionWidth, setActionWidth] = useState<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isDarkMode = useDarkMode();

  useEffect(() => {
    if (!containerRef.current) return;

    const measure = () => {
      if (!containerRef.current) return;
      const nodes = containerRef.current.querySelectorAll<HTMLDivElement>(
        '[data-role="actions"]'
      );
      let maxW = 0;
      nodes.forEach((n) => {
        maxW = Math.max(maxW, n.scrollWidth);
      });
      setActionWidth(maxW);
    };

    // Initial measure
    measure();

    // Observe action cells size changes
    const ro = new ResizeObserver(() => {
      measure();
    });
    resizeObserverRef.current = ro;
    const nodes = containerRef.current.querySelectorAll<HTMLDivElement>(
      '[data-role="actions"]'
    );
    nodes.forEach((n) => ro.observe(n));

    // Re-measure on window resize
    const onWindowResize = () => measure();
    window.addEventListener("resize", onWindowResize);

    return () => {
      window.removeEventListener("resize", onWindowResize);
      ro.disconnect();
    };
  }, [items.length]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max" ref={containerRef}>
        {items.map((contribution) => {
          const userInfo = contributionUsersInfo[contribution.user_id];
          const userName = userInfo?.name || "";
          const userAvatar = userInfo?.avatar_url || "";
          const cp = LEVEL_SCORES[contribution.issue_level as IssueLevel] || 0;
          const closedAt = formatDate(
            contribution.year,
            contribution.month,
            contribution.day
          );

          return (
            <div
              key={contribution.id}
              className="pl-3 md:pl-4 h-11 items-center group"
            >
              <div className="flex flex-row items-center h-11 gap-3 text-base">
                {/* Assignee */}
                <div className="flex items-center gap-2 w-42">
                  {userAvatar ? (
                    <Image
                      src={userAvatar}
                      alt={userName}
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded-full"
                      placeholder="blur"
                      blurDataURL={shimmerDataUrlWithTheme(20, 20, isDarkMode)}
                    />
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-black flex items-center justify-center text-xs text-gray-600 dark:text-gray-300"
                      title={userName}
                    >
                      {userName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="text-gray-900 text-sm dark:text-gray-100 truncate">
                    {userName}
                  </span>
                </div>

                {/* CP */}
                <span className="text-left text-sm w-20 text-gray-900 dark:text-gray-100">
                  {cp} CP
                </span>

                {/* Level */}
                <div className="text-left text-sm w-12">
                  {renderLevelLabel(contribution.issue_level, false, false)}
                </div>

                {/* Title */}
                <span className="text-left text-sm w-full text-gray-900 dark:text-gray-100 truncate">
                  {contribution.issue_title}
                </span>

                {/* Closed At */}
                <span className="text-left text-sm w-40 text-gray-900 dark:text-gray-100">
                  {closedAt}
                </span>

                {/* View Button */}
                <div className="sticky rounded-r-lg ml-auto right-0 flex items-center justify-start h-11 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark">
                  <div
                    data-role="actions"
                    className="flex items-center justify-start gap-0 px-2"
                    style={{
                      width: actionWidth ? `${actionWidth}px` : undefined,
                    }}
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      className="!text-sm"
                      onClick={() => onViewIssue(contribution.issue_id)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
