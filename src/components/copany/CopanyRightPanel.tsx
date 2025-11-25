"use client";

import { useMemo } from "react";
import { useRouter } from "@/hooks/useRouter";
import {
  Copany,
  IssueLevel,
  IssuePriority,
  IssueState,
  LEVEL_SCORES,
  IssueWithAssignee,
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
import Button from "@/components/commons/Button";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("rightPanel");

  // Fetch data for right panel
  const { data: issuesData } = useIssues(copanyId);
  const { data: discussionsData } = useDiscussions(copanyId);
  const { data: contributionsData } = useContributions(copanyId);
  const { data: contributorsData } = useContributors(copanyId);

  // Sort issues using the same logic as IssuesView.tsx
  const topIssues = useMemo(() => {
    const issues = issuesData ?? [];
    if (issues.length === 0) return [];

    // Group issues by state (merge Duplicate into Canceled)
    const grouped = issues.reduce((acc, issue) => {
      let state = issue.state || IssueState.Backlog;
      if (state === IssueState.Duplicate) {
        state = IssueState.Canceled;
      }
      if (!acc[state]) {
        acc[state] = [];
      }
      acc[state].push(issue);
      return acc;
    }, {} as Record<number, IssueWithAssignee[]>);

    // Priority sorting function: Urgent > High > Medium > Low > None
    const sortByPriority = (a: IssueWithAssignee, b: IssueWithAssignee) => {
      const priorityOrder: Record<number, number> = {
        [IssuePriority.Urgent]: 0,
        [IssuePriority.High]: 1,
        [IssuePriority.Medium]: 2,
        [IssuePriority.Low]: 3,
        [IssuePriority.None]: 4,
      };
      const aPriority = a.priority ?? IssuePriority.None;
      const bPriority = b.priority ?? IssuePriority.None;
      return priorityOrder[aPriority] - priorityOrder[bPriority];
    };

    // For Done / Canceled groups, sort by closed_at desc
    const sortByClosedAtDesc = (a: IssueWithAssignee, b: IssueWithAssignee) => {
      const aTime = a.closed_at ? new Date(a.closed_at).getTime() : 0;
      const bTime = b.closed_at ? new Date(b.closed_at).getTime() : 0;
      return bTime - aTime;
    };

    // State order: InReview > InProgress > Todo > Backlog > Done > Canceled
    const stateOrder = [
      IssueState.InReview,
      IssueState.InProgress,
      IssueState.Todo,
      IssueState.Backlog,
      IssueState.Done,
      IssueState.Canceled,
    ];

    // Flatten sorted issues by state order
    const sortedIssues: IssueWithAssignee[] = [];
    for (const state of stateOrder) {
      if (grouped[state] && grouped[state].length > 0) {
        const sorted =
          state === IssueState.Done || state === IssueState.Canceled
            ? grouped[state].slice().sort(sortByClosedAtDesc)
            : grouped[state].slice().sort(sortByPriority);
        sortedIssues.push(...sorted);
      }
    }

    return sortedIssues.slice(0, 4);
  }, [issuesData]);

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
          {t("about")}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <ExpandableText
          text={copany.description || t("defaultDescription")}
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
                ? t("usesCoslProtocol")
                : t("notUsesCoslProtocol")}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="flex flex-row items-center gap-[6px]">
            <StarSolidIcon className="w-5 h-5 text-[#FF9D0B]" />
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {formatAbbreviatedCount(copany.star_count ?? 0)} {t("stars")}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="flex flex-row items-center gap-[6px]">
            <ScaleIcon
              className="w-5 h-5 text-gray-900 dark:text-gray-100 p-[2px]"
              strokeWidth={1.5}
            />
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {copany.license || t("noLicenseSpecified")}
            </span>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const missionSection = copany.mission ? (
    <div className="flex flex-col gap-3">
      <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {t("mission")}
      </p>
      <ExpandableText
        text={copany.mission}
        maxLines={3}
        contentClassName="text-sm"
      />
    </div>
  ) : null;

  const visionSection = copany.vision ? (
    <div className="flex flex-col gap-3">
      <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {t("vision")}
      </p>
      <ExpandableText
        text={copany.vision}
        maxLines={3}
        contentClassName="text-sm"
      />
    </div>
  ) : null;

  const financeSection = showFinance ? (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between -mr-2">
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t("finance")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            navigateToTab("Distribute & Finance", {
              distributeFinanceTab: "Overview",
            })
          }
        >
          {t("viewMore")}
        </Button>
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
      <div className="flex items-start justify-between -mr-2">
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t("issues")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToTab("Works")}
        >
          {t("viewMore")}
        </Button>
      </div>
      <div className="flex flex-col gap-0">
        {topIssues.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t("noIssuesYet")}
          </div>
        )}
        {topIssues.map((issue) => (
          <div
            key={issue.id}
            className="flex flex-row items-center gap-2 py-2 px-2 -mx-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 rounded transition"
            onClick={() => router.push(`/copany/${copanyId}/issue/${issue.id}`)}
          >
            {renderPriorityLabel(issue.priority ?? IssuePriority.None, false)}
            {renderStateLabel(issue.state ?? IssueState.Backlog, false)}
            <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-1 w-full">
              {issue.title || t("untitledIssue")}
            </p>
            {renderLevelLabel(issue.level ?? IssueLevel.level_None, false)}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const discussionsSection = showDiscussions ? (
    <div className="">
      <div className="flex items-start justify-between -mr-2">
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t("discussions")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToTab("Works", { worksTab: "Discussion" })}
        >
          {t("viewMore")}
        </Button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {topDiscussions.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t("noDiscussionsYet")}
          </div>
        )}
        {topDiscussions.map((discussion) => (
          <div
            key={discussion.id}
            className="flex flex-col gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 rounded p-2 -m-2 transition"
            onClick={() =>
              router.push(`/copany/${copanyId}/discussion/${discussion.id}`)
            }
          >
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
      <div className="flex items-start justify-between -mr-2">
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t("contribution")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            navigateToTab("Contribution & Finance", {
              contributionFinanceTab: "Overview",
            })
          }
        >
          {t("viewMore")}
        </Button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {topContributors.length === 0 && (
          <div className="text-base text-gray-500 dark:text-gray-400">
            {t("noContributionDataYet")}
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
      {missionSection}
      {visionSection}
      {financeSection}
      {issuesSection}
      {discussionsSection}
      {contributionsSection}
    </div>
  );
}
