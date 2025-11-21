"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useCopany } from "@/hooks/copany";
import { useCurrentUser } from "@/hooks/currentUser";
import { useDistributes, useUpdateDistribute } from "@/hooks/finance";
import type { DistributeRow } from "@/types/database.types";
import type { UserInfo } from "@/actions/user.actions";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import {
  ArrowUpRightIcon,
  ReceiptPercentIcon,
} from "@heroicons/react/24/outline";
import { useUsersInfo } from "@/hooks/userInfo";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import Button from "@/components/commons/Button";
import Modal from "@/components/commons/Modal";
import StatusLabel from "@/components/commons/StatusLabel";
import LoadingView from "@/components/commons/LoadingView";
import { getMonthlyPeriod, getMonthlyPeriodSimple } from "@/utils/time";
import CountdownTimer from "@/components/commons/CountdownTimer";
import { useRouter } from "next/navigation";
import DistributeDetailModal from "./_components/DistributeDetailModal";
import DistributeEvidenceModal from "./_components/DistributeEvidenceModal";

// Helper function to format amount with sign
function formatAmount(amount: number, currency: string): string {
  const absAmount = Math.abs(amount);
  return `${currency} ${absAmount.toFixed(2)}`;
}

export default function DistributeView({ copanyId }: { copanyId: string }) {
  const router = useRouter();
  const { data: copany } = useCopany(copanyId);
  const { data: currentUser } = useCurrentUser();
  const { data: distributes, isLoading: isDistributesLoading } =
    useDistributes(copanyId);
  const updateDistribute = useUpdateDistribute(copanyId);

  // Get unique user IDs from distributes for user info
  const distributeUserIds = useMemo(() => {
    if (!distributes || distributes.length === 0) return [];
    return Array.from(new Set(distributes.map((d) => d.to_user)));
  }, [distributes]);

  // Fetch user info for distribute users
  const { data: distributeUsersInfo = {} } = useUsersInfo(distributeUserIds);

  // Calculate current distribution month based on copany settings
  const currentDistributionMonth = useMemo(() => {
    if (!copany) return null;

    const delayDays = copany.distribution_delay_days ?? 90;
    const now = new Date();
    const distributionDate = new Date(now);
    distributionDate.setUTCDate(distributionDate.getUTCDate() - delayDays);
    const distributionYear = distributionDate.getUTCFullYear();
    const distributionMonthIndex = distributionDate.getUTCMonth();

    return `${distributionYear}-${String(distributionMonthIndex + 1).padStart(
      2,
      "0"
    )}`;
  }, [copany]);

  // Group distributes by distribution_month
  const groupedDistributes = useMemo(() => {
    const groups = new Map<
      string,
      {
        period: { start: Date; end: Date; key: string };
        items: DistributeRow[];
        totalAmount: number;
        distributionMonthKey: string | null;
      }
    >();

    // Helper function to parse YYYY-MM and create period
    const createPeriodFromMonth = (
      monthStr: string | null
    ): { start: Date; end: Date; key: string } => {
      if (!monthStr) {
        // Fallback to current month if distribution_month is null
        return getMonthlyPeriod(new Date());
      }

      const [yearStr, monthPart] = monthStr.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthPart, 10) - 1; // JavaScript months are 0-indexed

      const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

      const months = [
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

      const key = `${months[month]} ${year}`;

      return { start, end, key };
    };

    // Add existing distributes to groups
    if (distributes && distributes.length > 0) {
      distributes.forEach((distribute) => {
        const period = createPeriodFromMonth(distribute.distribution_month);
        const key = period.key;

        if (!groups.has(key)) {
          groups.set(key, {
            period,
            items: [],
            totalAmount: 0,
            distributionMonthKey: distribute.distribution_month,
          });
        }

        const group = groups.get(key)!;
        group.items.push(distribute);
        group.totalAmount += distribute.amount;
      });
    }

    // Sort groups by start date (newest first)
    return Array.from(groups.values()).sort(
      (a, b) => b.period.start.getTime() - a.period.start.getTime()
    );
  }, [distributes]);

  // Separate current distribution month and historical records
  const currentDistributionGroup = useMemo(() => {
    if (!currentDistributionMonth) return null;
    return (
      groupedDistributes.find(
        (group) => group.distributionMonthKey === currentDistributionMonth
      ) || null
    );
  }, [groupedDistributes, currentDistributionMonth]);

  const historicalGroups = useMemo(() => {
    if (!currentDistributionMonth) return groupedDistributes;
    return groupedDistributes.filter(
      (group) => group.distributionMonthKey !== currentDistributionMonth
    );
  }, [groupedDistributes, currentDistributionMonth]);

  const [_uploadingId, _setUploadingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDistributeId, setSelectedDistributeId] = useState<
    string | null
  >(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewDistribute, setViewDistribute] = useState<DistributeRow | null>(
    null
  );

  const isOwner = useMemo(() => {
    return !!(copany && currentUser && copany.created_by === currentUser.id);
  }, [copany, currentUser]);

  if (isDistributesLoading) {
    return <LoadingView type="label" />;
  }

  // Check if there are any groups with items
  const hasGroupsWithItems =
    (currentDistributionGroup && currentDistributionGroup.items.length > 0) ||
    historicalGroups.some((group) => group.items.length > 0);

  if (!hasGroupsWithItems) {
    return (
      <div className="p-4">
        <EmptyPlaceholderView
          icon={
            <ReceiptPercentIcon
              className="w-16 h-16 text-gray-500 dark:text-gray-400"
              strokeWidth={1}
            />
          }
          title="No distribute records"
          description={
            <>
              Distribution records are automatically generated based on the
              transaction log and each contributor&apos;s allocation ratio. The
              records are generated daily based on the distribution settings.
            </>
          }
          buttonIcon={<ArrowUpRightIcon className="w-4 h-4" />}
          buttonTitle="View Finance"
          buttonAction={() => {
            router.push(
              `/copany/${copanyId}?tab=Distribute & Finance&distributeFinanceTab=Overview`
            );
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-0 flex flex-col gap-6">
      {/* Current Distribution Section */}
      {currentDistributionGroup &&
        currentDistributionGroup.items.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Current Distribution Month
            </p>
            <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="">
                {/* Period Header */}
                <div className="flex h-11 items-center w-full px-3 md:px-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center w-full justify-between">
                    <h3 className="text-sm font-medium">
                      {currentDistributionGroup.period.key}
                    </h3>
                    <span className="text-sm font-medium">
                      {formatAmount(
                        currentDistributionGroup.totalAmount,
                        currentDistributionGroup.items[0]?.currency || "USD"
                      )}
                    </span>
                  </div>
                </div>

                {/* Distribute Items */}
                <DistributeGroupList
                  items={currentDistributionGroup.items}
                  distributeUsersInfo={distributeUsersInfo}
                  isOwner={isOwner}
                  currentUserId={currentUser?.id}
                  onOpenTransfer={(id) => {
                    setSelectedDistributeId(id);
                    setIsModalOpen(true);
                  }}
                  onOpenView={(d) => {
                    setViewDistribute(d);
                    setIsViewModalOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
        )}

      {/* Historical Distribution Section */}
      {historicalGroups.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Historical Distribution Records
          </p>
          <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {historicalGroups.map((group) => (
              <div key={group.period.key} className="">
                {/* Period Header */}
                <div className="flex h-11 items-center w-full px-3 md:px-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center w-full justify-between">
                    <h3 className="text-sm font-medium">{group.period.key}</h3>
                    <span className="text-sm font-medium">
                      {formatAmount(
                        group.totalAmount,
                        group.items[0]?.currency || "USD"
                      )}
                    </span>
                  </div>
                </div>

                {/* Distribute Items (group-level horizontal scroll) */}
                {group.items.length === 0 ? (
                  <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                    No distribution records for this month.
                  </div>
                ) : (
                  <DistributeGroupList
                    items={group.items}
                    distributeUsersInfo={distributeUsersInfo}
                    isOwner={isOwner}
                    currentUserId={currentUser?.id}
                    onOpenTransfer={(id) => {
                      setSelectedDistributeId(id);
                      setIsModalOpen(true);
                    }}
                    onOpenView={(d) => {
                      setViewDistribute(d);
                      setIsViewModalOpen(true);
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distribute Evidence Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDistributeId(null);
        }}
        size="md"
      >
        <DistributeEvidenceModal
          distribute={
            distributes?.find((d) => d.id === selectedDistributeId) || null
          }
          userInfo={
            distributeUsersInfo[
              distributes?.find((d) => d.id === selectedDistributeId)
                ?.to_user || ""
            ]
          }
          copanyId={copanyId}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDistributeId(null);
          }}
          onConfirm={async (evidenceUrl: string | null) => {
            if (selectedDistributeId) {
              await updateDistribute.mutateAsync({
                id: selectedDistributeId,
                changes: {
                  status: "in_review",
                  evidence_url: evidenceUrl,
                },
              });
            }
            setIsModalOpen(false);
            setSelectedDistributeId(null);
          }}
        />
      </Modal>

      {/* Distribute View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewDistribute(null);
        }}
        size="md"
      >
        {viewDistribute && (
          <DistributeDetailModal
            distribute={viewDistribute}
            userInfo={distributeUsersInfo[viewDistribute.to_user]}
            canConfirm={
              (currentUser &&
                currentUser.id === viewDistribute.to_user &&
                viewDistribute.status === "in_review") ||
              false
            }
            onConfirm={async () => {
              await updateDistribute.mutateAsync({
                id: viewDistribute.id,
                changes: { status: "confirmed" },
              });
              setIsViewModalOpen(false);
              setViewDistribute(null);
            }}
            onClose={() => {
              setIsViewModalOpen(false);
              setViewDistribute(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

// Group list with unified action width
function DistributeGroupList({
  items,
  distributeUsersInfo,
  isOwner,
  currentUserId,
  onOpenTransfer,
  onOpenView,
}: {
  items: DistributeRow[];
  distributeUsersInfo: Record<string, UserInfo>;
  isOwner: boolean;
  currentUserId?: string;
  onOpenTransfer: (id: string) => void;
  onOpenView: (item: DistributeRow) => void;
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
  }, [
    // re-bind observers when the set of rows or permission-affecting props change
    items.length,
    isOwner,
    currentUserId,
  ]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max" ref={containerRef}>
        {items.map((d) => {
          const userInfo = distributeUsersInfo[d.to_user];
          const contributorName = userInfo?.name || "";
          const contributorAvatar = userInfo?.avatar_url || "";
          const canView =
            isOwner || (currentUserId && currentUserId === d.to_user);
          const isPendingReview =
            d.status === "in_review" && currentUserId === d.to_user;

          return (
            <div
              key={d.id}
              className={`pl-3 md:pl-4 h-11 items-center group ${
                isPendingReview ? "bg-purple-100 dark:bg-purple-900/30" : ""
              }`}
            >
              <div className="flex flex-row items-center h-11 gap-3 text-sm">
                <div className="flex items-center gap-2 w-36">
                  {contributorAvatar ? (
                    <Image
                      src={contributorAvatar}
                      alt={contributorName}
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded-full"
                      placeholder="blur"
                      blurDataURL={shimmerDataUrlWithTheme(20, 20, isDarkMode)}
                    />
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-black flex items-center justify-center text-xs text-gray-600 dark:text-gray-300"
                      title={contributorName}
                    >
                      {contributorName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {contributorName}
                  </span>
                </div>
                <span className="text-sm text-left w-20">
                  {d.contribution_percent}%
                </span>
                <span className="text-sm text-left w-36">
                  {formatAmount(d.amount, d.currency)}
                </span>
                <span className="text-sm text-left w-36">
                  <StatusLabel status={d.status} showText={true} />
                </span>
                <div
                  className={`sticky ml-auto right-0 flex items-center justify-start h-11 border-l border-gray-200 dark:border-gray-700 ${
                    isPendingReview
                      ? "bg-purple-100 dark:bg-transparent"
                      : "bg-white dark:bg-background-dark"
                  }`}
                >
                  <div
                    data-role="actions"
                    className="flex items-center justify-start gap-0 px-2"
                    style={{
                      width: actionWidth ? `${actionWidth}px` : undefined,
                    }}
                  >
                    {d.status === "in_progress" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="!text-sm"
                        onClick={() => onOpenTransfer(d.id)}
                        disabled={!isOwner}
                        disableTooltipConent={
                          !isOwner
                            ? "You are not the owner of this copany"
                            : undefined
                        }
                      >
                        Distribute
                      </Button>
                    )}
                    {(d.status === "in_review" || d.status === "confirmed") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="!text-sm"
                        disabled={!canView}
                        disableTooltipConent={
                          !canView ? "No permission to view" : undefined
                        }
                        onClick={() => {
                          if (!canView) return;
                          onOpenView(d);
                        }}
                      >
                        View
                      </Button>
                    )}
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
