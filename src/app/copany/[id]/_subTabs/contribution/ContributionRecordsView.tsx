"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useContributions } from "@/hooks/contributions";
import { useUsersInfo } from "@/hooks/userInfo";
import { useCopany } from "@/hooks/copany";
import { useCurrentUser } from "@/hooks/currentUser";
import type { Contribution } from "@/types/database.types";
import { IssueLevel, LEVEL_SCORES } from "@/types/database.types";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import LoadingView from "@/components/commons/LoadingView";
import Button from "@/components/commons/Button";
import Modal from "@/components/commons/Modal";
import { getMonthlyPeriod, getMonthlyPeriodSimple } from "@/utils/time";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import { TableCellsIcon, PlusIcon } from "@heroicons/react/24/outline";
import { renderLevelLabel } from "@/app/copany/[id]/_subTabs/issue/_components/IssueLevelSelector";
import HistoryIssueCreateModal from "./_components/HistoryIssueCreateModal";

// Helper function to format date
function formatDate(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ContributionRecordsView({
  copanyId,
}: {
  copanyId: string;
}) {
  const router = useRouter();
  const { data: contributions, isLoading: isContributionsLoading } =
    useContributions(copanyId);
  const { data: copany } = useCopany(copanyId);
  const { data: currentUser } = useCurrentUser();
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Check if current user is owner
  const isOwner = useMemo(() => {
    return !!(copany && currentUser && copany.created_by === currentUser.id);
  }, [copany, currentUser]);

  // Filter contributions with valid level
  const validContributions = useMemo(() => {
    if (!contributions) return [];
    return contributions.filter(
      (contribution) => contribution.issue_level !== IssueLevel.level_None
    );
  }, [contributions]);

  // Keep all contributions together (no separation needed)

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

  if (isContributionsLoading) {
    return <LoadingView type="label" />;
  }

  // Check if there are any contributions
  const hasContributions = groupedContributions.some((group) => !group.isEmpty);

  if (!hasContributions) {
    return (
      <div className="p-0">
        <EmptyPlaceholderView
          icon={
            <TableCellsIcon
              className="w-16 h-16 text-gray-500 dark:text-gray-400"
              strokeWidth={1}
            />
          }
          title="No contribution records"
          description="Contribution records are generated from completed issues. Complete some issues to see contribution records here."
          buttonIcon={<PlusIcon className="w-4 h-4" />}
          buttonTitle="Add History Issues"
          buttonAction={() => setIsHistoryModalOpen(true)}
          buttonDisabled={!isOwner}
          buttonTooltip="Only the owner can add history issues"
        />

        {/* Modal */}
        <Modal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          size="lg"
        >
          <HistoryIssueCreateModal
            copanyId={copanyId}
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            onSuccess={() => {
              setIsHistoryModalOpen(false);
              // Contributions will auto-refresh via React Query
            }}
          />
        </Modal>
      </div>
    );
  }

  return (
    <div className="p-0">
      {/* Add History Issues button - only visible to owner */}
      {isOwner && (
        <div className="px-0 md:px-4 pt-2 pb-3">
          <Button onClick={() => setIsHistoryModalOpen(true)}>
            Add History Issues
          </Button>
        </div>
      )}

      {/* All Contribution Records */}
      <div className="relative border-b border-gray-200 dark:border-gray-700">
        {groupedContributions.map((group) => (
          <div key={group.period.key} className="">
            {/* Period Header */}
            <div className="flex h-11 items-center w-full px-3 md:px-4 bg-gray-100 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
              <div className="flex items-center w-full justify-between">
                <h3 className="text-base font-medium">
                  {getMonthlyPeriodSimple(group.period.start)}
                </h3>
                <span className="text-base font-medium">
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

      {/* Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        size="lg"
      >
        <HistoryIssueCreateModal
          copanyId={copanyId}
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          onSuccess={() => {
            setIsHistoryModalOpen(false);
            // Contributions will auto-refresh via React Query
          }}
        />
      </Modal>
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
                  <span className="text-gray-900 dark:text-gray-100 truncate">
                    {userName}
                  </span>
                </div>

                {/* CP */}
                <span className="text-left w-20 text-gray-900 dark:text-gray-100">
                  {cp} CP
                </span>

                {/* Level */}
                <div className="text-left w-12">
                  {renderLevelLabel(contribution.issue_level, false, false)}
                </div>

                {/* Title */}
                <span className="text-left w-64 text-gray-900 dark:text-gray-100 truncate">
                  {contribution.issue_title}
                </span>

                {/* Closed At */}
                <span className="text-left w-32 text-gray-600 dark:text-gray-400">
                  {closedAt}
                </span>

                {/* View Button */}
                <div className="sticky ml-auto right-0 flex items-center justify-start h-11 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark">
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
                      className="!text-base"
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
