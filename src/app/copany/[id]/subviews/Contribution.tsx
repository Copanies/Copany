"use client";
import { useState, useEffect, useMemo } from "react";
import { generateContributionsFromIssuesAction } from "@/actions/contribution.actions";
import { getCopanyContributorsAction } from "@/actions/copanyContributor.actions";
import {
  Contribution,
  IssueLevel,
  AssigneeUser,
  CopanyContributor,
  LEVEL_SCORES,
} from "@/types/database.types";
import LoadingView from "@/components/commons/LoadingView";
import ContributionChart from "@/components/ContributionChart";

// 贡献等级标签渲染函数
function renderLevelLabel(level: number): string {
  switch (level) {
    case IssueLevel.level_S:
      return "S级";
    case IssueLevel.level_A:
      return "A级";
    case IssueLevel.level_B:
      return "B级";
    case IssueLevel.level_C:
      return "C级";
    case IssueLevel.level_None:
    default:
      return "无等级";
  }
}

interface ContributionViewProps {
  copanyId: string;
}

export default function ContributionView({ copanyId }: ContributionViewProps) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contributors, setContributors] = useState<CopanyContributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [contributionData, contributorData] = await Promise.all([
          generateContributionsFromIssuesAction(copanyId),
          getCopanyContributorsAction(copanyId),
        ]);
        setContributions(contributionData);
        setContributors(contributorData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [copanyId]);

  // 将 contributors 转换为 AssigneeUser 格式
  const users: AssigneeUser[] = contributors.map((contributor) => ({
    id: contributor.user_id,
    name: contributor.name,
    email: contributor.email,
    avatar_url: contributor.avatar_url,
  }));

  // 计算 globalMaxCount、globalMaxScore 和月份范围
  const { globalMaxCount, globalMaxScore, monthRange } = useMemo(() => {
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

    // 找到最大值
    let maxCount = 1;
    let maxScore = 1;
    Object.values(userMonthlyData).forEach((userData) => {
      Object.values(userData).forEach((monthData) => {
        maxCount = Math.max(maxCount, monthData.totalCount);
        maxScore = Math.max(maxScore, monthData.totalScore);
      });
    });

    return {
      globalMaxCount: maxCount,
      globalMaxScore: maxScore,
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

  return (
    <div>
      {/* 图表展示 */}
      <div>
        <h2>用户贡献图表</h2>
        <div className="flex flex-row gap-4">
          {users.map((user) => (
            <div className="w-1/2" key={user.id}>
              <ContributionChart
                contributions={contributions.filter(
                  (c) => c.user_id === user.id
                )}
                user={user}
                globalMaxCount={globalMaxCount}
                globalMaxScore={globalMaxScore}
                monthRange={monthRange}
              />
            </div>
          ))}
        </div>
      </div>

      <hr style={{ margin: "40px 0" }} />

      {/* 列表展示 */}
      <div>
        <h2>贡献记录详情 (共 {contributions.length} 条)</h2>

        {contributions.length === 0 ? (
          <div>
            <p>暂无贡献记录</p>
            <p>完成 Issue 后将显示贡献记录</p>
          </div>
        ) : (
          <ul>
            {contributions.map((contribution) => (
              <li key={contribution.id}>
                <div>
                  <h3>{contribution.issue_title}</h3>
                  <p>Issue ID: {contribution.issue_id}</p>
                  <p>
                    等级: {renderLevelLabel(contribution.issue_level)} (
                    {LEVEL_SCORES[contribution.issue_level as IssueLevel] || 0}
                    分)
                  </p>
                  <p>
                    完成时间: {contribution.year}-
                    {String(contribution.month).padStart(2, "0")}-
                    {String(contribution.day).padStart(2, "0")}
                  </p>
                  <p>贡献者 ID: {contribution.user_id}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
