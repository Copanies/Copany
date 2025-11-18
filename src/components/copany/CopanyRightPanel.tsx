"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Copany,
  IssueLevel,
  IssuePriority,
  IssueState,
  LEVEL_SCORES,
} from "@/types/database.types";
import { useIssues } from "@/hooks/issues";
import { useDiscussions } from "@/hooks/discussions";
import { useContributions } from "@/hooks/contributions";
import { useContributors } from "@/hooks/contributors";
import { renderPriorityLabel } from "@/components/issue/IssuePrioritySelector";
import { renderLevelLabel } from "@/components/issue/IssueLevelSelector";
import { renderStateLabel } from "@/components/issue/IssueStateSelector";
import UserAvatar from "@/components/commons/UserAvatar";
import { ScaleIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import ExpandableText from "@/components/commons/ExpandableText";
import FinanceOverviewChart from "@/components/finance/FinanceOverviewChart";
import { formatAbbreviatedCount } from "@/utils/number";

interface CopanyRightPanelProps {
  copanyId: string;
  copany: Copany;
  showAbout?: boolean;
  showFinance?: boolean;
  showIssues?: boolean;
  showDiscussions?: boolean;
  showContributions?: boolean;
}

export default function CopanyRightPanel({
  copanyId,
  copany,
  showAbout = true,
  showFinance = true,
  showIssues = true,
  showDiscussions = true,
  showContributions = true,
}: CopanyRightPanelProps) {
  const router = useRouter();

  // Fetch data for right panel
  const { data: issuesData } = useIssues(copanyId);
  const { data: discussionsData } = useDiscussions(copanyId);
  const { data: contributionsData } = useContributions(copanyId);
  const { data: contributorsData } = useContributors(copanyId);

  const issues = issuesData ?? [];
  const topIssues = issues.slice(0, 4);

  const discussions = useMemo(() => {
    if (!discussionsData?.pages) return [];
    return discussionsData.pages.flatMap((page) => page.discussions);
  }, [discussionsData]);
  const topDiscussions = discussions.slice(0, 4);

  const contributionsByUser = useMemo(() => {
    const map = new Map<string, number>();
    (contributionsData ?? []).forEach((contribution) => {
      const level = contribution.issue_level as IssueLevel;
      const score = LEVEL_SCORES[level] ?? 0;
      map.set(
        contribution.user_id,
        (map.get(contribution.user_id) ?? 0) + score
      );
    });
    return map;
  }, [contributionsData]);

  const contributorEntries = useMemo(() => {
    return (contributorsData ?? [])
      .map((contributor) => ({
        ...contributor,
        points:
          contributionsByUser.get(contributor.user_id) ??
          contributor.contribution ??
          0,
      }))
      .sort((a, b) => b.points - a.points);
  }, [contributorsData, contributionsByUser]);

  const topContributors = contributorEntries.slice(0, 5);

  const formatCP = (value: number) =>
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(value);

  const navigateToTab = (tab: string, extraParams?: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (extraParams) {
      Object.entries(extraParams).forEach(([key, value]) => {
        params.set(key, value);
      });
    }
    router.push(`/copany/${copanyId}?${params.toString()}`);
  };

  const aboutSection = showAbout ? (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
          About
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <ExpandableText
          text={
            copany.description ||
            "Copany empowers builders to collaborate with transparent contribution tracking."
          }
          maxLines={4}
        />
        <div className="flex flex-col gap-[6px]">
          <div className="flex flex-row items-center gap-[6px]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill={copany.isDefaultUseCOSL ? "#27AE60" : "#E74C3C"}
              className="w-4 h-4 m-[2px]"
            >
              <circle cx="8" cy="8" r="8" />
            </svg>
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {copany.isDefaultUseCOSL
                ? "采用 COSL 协议，按贡献分配收益"
                : "未采用 COSL 协议，无法保证贡献者收益"}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="flex flex-row items-center gap-[6px]">
            <StarSolidIcon className="w-5 h-5 text-[#FF9D0B]" />
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {formatAbbreviatedCount(copany.star_count ?? 0)} stars
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="flex flex-row items-center gap-[6px]">
            <ScaleIcon
              className="w-5 h-5 text-gray-600 dark:text-gray-400 p-[2px]"
              strokeWidth={2}
            />
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {copany.license || "No license specified"}
            </span>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const financeSection = showFinance ? (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Finance
        </p>
      </div>
      <FinanceOverviewChart
        copanyId={copanyId}
        size="small"
        showLatestRevenue={false}
        showAvgMonthlyRevenue={true}
        showOneYearRevenue={false}
        showAllRevenue={false}
      />
    </div>
  ) : null;

  const issuesSection = showIssues ? (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Issues
          </p>
        </div>
        <button
          className="text-sm text-secondary hover:text-secondary/80 transition"
          onClick={() => navigateToTab("Works")}
        >
          View More
        </button>
      </div>
      <div className="flex flex-col gap-0">
        {topIssues.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No issues yet. Start by creating one in Works.
          </div>
        )}
        {topIssues.map((issue) => (
          <div key={issue.id} className="flex flex-row items-center gap-2 py-2">
            {renderPriorityLabel(issue.priority ?? IssuePriority.None, false)}
            {renderStateLabel(issue.state ?? IssueState.Backlog, false)}
            <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-1 w-full">
              {issue.title || "Untitled issue"}
            </p>
            {renderLevelLabel(issue.level ?? IssueLevel.level_None, false)}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const discussionsSection = showDiscussions ? (
    <div className="">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Discussions
          </p>
        </div>
        <button
          className="text-sm text-secondary hover:text-secondary/80 transition"
          onClick={() => navigateToTab("Discussion")}
        >
          View More
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {topDiscussions.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No discussions yet. Spark the first conversation.
          </div>
        )}
        {topDiscussions.map((discussion) => (
          <div key={discussion.id} className="flex flex-col gap-1">
            <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
              {discussion.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const contributionsSection = showContributions ? (
    <div className="">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Contribution
          </p>
        </div>
        <button
          className="text-base text-secondary hover:text-secondary/80 transition"
          onClick={() => navigateToTab("Contribution")}
        >
          View More
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {topContributors.length === 0 && (
          <div className="text-base text-gray-500 dark:text-gray-400">
            No contribution data yet. Complete issues to earn CP.
          </div>
        )}
        {topContributors.map((contributor) => (
          <div
            key={contributor.user_id}
            className="flex items-center justify-between rounded-xl"
          >
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar
                userId={contributor.user_id}
                name={contributor.name}
                avatarUrl={contributor.avatar_url}
                email={contributor.email}
                size="lg"
                showTooltip={false}
              />
              <div className="flex flex-col min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                  {contributor.name}
                </p>
              </div>
            </div>
            <span className="text-sm text-gray-900 dark:text-gray-100 shrink-0">
              {formatCP(contributor.points)} CP
            </span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      {aboutSection}
      {financeSection}
      {issuesSection}
      {discussionsSection}
      {contributionsSection}
    </div>
  );
}
