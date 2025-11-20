"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type {
  Notification,
  NotificationPayload,
  Copany,
} from "@/types/database.types";
import { IssueState, IssuePriority, IssueLevel } from "@/types/database.types";
import Button from "@/components/commons/Button";
import { useRouter } from "next/navigation";
import { BellAlertIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  HandRaisedIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ReceiptPercentIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import { renderStateLabel } from "@/components/issue/IssueStateSelector";
import ArrowshapeUpFillIcon from "@/components/icon/ArrowshapeUpFillIcon";
import ArrowshapeUpFillDarkIcon from "@/components/icon/ArrowshapeUpFillDarkIcon";
import { renderPriorityLabel } from "@/components/issue/IssuePrioritySelector";
import { renderLevelLabel } from "@/components/issue/IssueLevelSelector";
import { useUsersInfo } from "@/hooks/userInfo";
import { formatRelativeTime } from "@/utils/time";
import type { UserInfo } from "@/actions/user.actions";
import { useNotifications, useMarkNotifications } from "@/hooks/notifications";
import { getCopanyByIdAction } from "@/actions/copany.actions";
import { listNotificationsAction } from "@/actions/notification.actions";
import { formatAbbreviatedCount } from "@/utils/number";
import { useDarkMode } from "@/utils/useDarkMode";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import LoadingView from "@/components/commons/LoadingView";
import UserAvatar from "@/components/commons/UserAvatar";

// Stable empty array to avoid re-creating [] on every render,
// which would otherwise retrigger effects depending on it
const EMPTY_NOTIFICATIONS: Notification[] = [];

function BellIcon({ unreadCount }: { unreadCount: number }) {
  return (
    <div className="relative flex flex-row gap-2">
      <BellAlertIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 inline-flex px-[4.2px] h-[19px] items-center justify-center bg-red-500 border-2 border-white dark:border-[#0a0a0a] text-white rounded-full text-xs font-medium">
          {formatAbbreviatedCount(unreadCount)}
        </div>
      )}
    </div>
  );
}

export default function NotificationBell() {
  const router = useRouter();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [copanies, setCopanies] = useState<Record<string, Copany>>({});
  const { data: notificationsData } = useNotifications();
  // Use a stable fallback to prevent effect dependency churn
  const baseNotifications = notificationsData?.items ?? EMPTY_NOTIFICATIONS;
  const unreadCount = notificationsData?.unread || 0;
  const markMutation = useMarkNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const isDarkMode = useDarkMode();
  // Local list for pagination-append
  const [list, setList] = useState<Notification[]>(EMPTY_NOTIFICATIONS);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only update when the reference really changes to avoid render loops
    setList((prev) => (prev === baseNotifications ? prev : baseNotifications));
  }, [baseNotifications]);

  const { data: actorUsersMap } = useUsersInfo(
    Array.from(
      new Set(
        list
          .map((n) => n.actor_id)
          .filter((v): v is string => typeof v === "string" && v.length > 0)
      )
    )
  );

  const actorUsers: Record<string, UserInfo> = actorUsersMap || {};

  const fetchMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await listNotificationsAction(20, nextCursor);
      if (data && data.length > 0) {
        setList((prev) => {
          const merged = [...prev, ...data];
          return merged;
        });
        const last = data[data.length - 1] as
          | { created_at?: string }
          | undefined;
        setNextCursor(last?.created_at ?? null);
      } else {
        setNextCursor(null);
      }
    } catch (error) {
      console.error("[NotificationBell] fetchMore → error", error);
    }
    setIsLoadingMore(false);
  };

  const markAllRead = async () => {
    try {
      await markMutation.mutateAsync({ all: true });
    } catch (_) {}
  };

  const markOneRead = async (id: string) => {
    try {
      await markMutation.mutateAsync({ ids: [id] });
    } catch (_) {}
  };

  // Load Copany infos for notifications
  const loadCopanies = useCallback(
    async (items: Notification[]) => {
      const ids = Array.from(
        new Set(
          items.map((n) => n.copany_id).filter((id): id is string => !!id)
        )
      );
      const missing = ids.filter((id) => !copanies[id]);
      if (missing.length === 0) return;
      const results = await Promise.all(
        missing.map(async (id) => {
          try {
            const data = await getCopanyByIdAction(id);
            return data ? ([id, data] as const) : null;
          } catch (_e) {
            return null;
          }
        })
      );
      const entries = results.filter(Boolean) as ReadonlyArray<
        readonly [string, Copany]
      >;
      if (entries.length > 0) {
        setCopanies((prev) => {
          const next = { ...prev } as Record<string, Copany>;
          for (const [id, c] of entries) next[id] = c;
          return next;
        });
      }
    },
    [copanies]
  );

  useEffect(() => {
    const last = list[list.length - 1] as { created_at?: string } | undefined;
    setNextCursor(last?.created_at ?? null);
  }, [list]);

  useEffect(() => {
    if (list.length > 0) {
      loadCopanies(list);
    }
  }, [list, loadCopanies]);

  const simpleText = (n: Notification) => {
    switch (n.type) {
      case "comment_reply":
        return "replied to you";
      case "new_comment":
        return "commented in the Issue";
      case "new_issue":
        return "created a new Issue";
      case "copany_starred":
        return "starred the Copany";
      case "issue_assigned":
        return "assigned you to the Issue";
      case "issue_state_changed":
        return "updated the Issue state";
      case "issue_priority_changed":
        return "updated the Issue priority";
      case "issue_level_changed":
        return "updated the Issue level";
      case "issue_closed":
        return "closed the Issue";
      case "mention":
        return "mentioned you in the Issue";
      case "assignment_request_received":
        return "requested to be assigned";
      case "assignment_request_accepted":
        return "accepted your assignment";
      case "assignment_request_refused":
        return "refused your assignment";
      case "review_requested":
        return "requested you to review";
      case "review_approved":
        return "approved the review";
      case "discussion_created":
        return "created a new Discussion";
      case "discussion_voted":
        return "voted on your Discussion";
      case "discussion_comment_created":
        return "commented on your Discussion";
      case "discussion_comment_voted":
        return "voted on your comment";
      case "discussion_comment_reply":
        return "replied to your comment";
      case "distribute_created":
        return "created a distribution for you";
      case "distribute_submitted":
        return "submitted distribution for review";
      case "distribute_confirmed":
        return "confirmed your distribution";
      case "transaction_created":
        return "created a new transaction";
      case "transaction_confirmed":
        return "confirmed your transaction";
      default:
        return "Notification";
    }
  };

  const openTarget = async (n: Notification) => {
    await markOneRead(n.id);
    if (n.issue_id) {
      const anchor = n.comment_id ? `#comment-${n.comment_id}` : "";
      router.push(`/copany/${n.copany_id}/issue/${n.issue_id}${anchor}`);
    } else if (n.discussion_id) {
      const anchor = n.discussion_comment_id
        ? `#comment-${n.discussion_comment_id}`
        : "";
      router.push(
        `/copany/${n.copany_id}/discussion/${n.discussion_id}${anchor}`
      );
    } else if (n.distribute_id || n.transaction_id) {
      router.push(
        `/copany/${n.copany_id}?tab=Finance&financeTab=${
          n.distribute_id ? "Distribute" : "Transactions"
        }`
      );
    } else if (n.copany_id) {
      router.push(`/copany/${n.copany_id}`);
    }
  };

  type NumericLike = number | string | null | undefined;

  const getStateName = (v: NumericLike): string => {
    const value = typeof v === "number" ? v : Number(v);
    switch (value) {
      case IssueState.Backlog:
        return "Backlog";
      case IssueState.Todo:
        return "Todo";
      case IssueState.InProgress:
        return "In Progress";
      case IssueState.InReview:
        return "In Review";
      case IssueState.Done:
        return "Done";
      case IssueState.Canceled:
        return "Canceled";
      case IssueState.Duplicate:
        return "Duplicate";
      default:
        return value || value === 0 ? String(value) : "";
    }
  };

  const getPriorityName = (v: NumericLike): string => {
    const value = typeof v === "number" ? v : Number(v);
    switch (value) {
      case IssuePriority.None:
        return "No priority";
      case IssuePriority.Urgent:
        return "Urgent";
      case IssuePriority.High:
        return "High";
      case IssuePriority.Medium:
        return "Medium";
      case IssuePriority.Low:
        return "Low";
      default:
        return value || value === 0 ? String(value) : "";
    }
  };

  const getLevelName = (v: NumericLike): string => {
    const value = typeof v === "number" ? v : Number(v);
    switch (value) {
      case IssueLevel.level_S:
        return "Level S";
      case IssueLevel.level_A:
        return "Level A";
      case IssueLevel.level_B:
        return "Level B";
      case IssueLevel.level_C:
        return "Level C";
      case IssueLevel.level_None:
        return "Unknown level";
      default:
        return value || value === 0 ? String(value) : "";
    }
  };

  const renderSecondaryLine = (n: Notification): React.ReactNode => {
    const p = n.payload || ({} as NotificationPayload);
    const withIssue = n as unknown as { issue?: { title?: string | null } };
    const latestTitle =
      withIssue?.issue?.title || p.issue_title || p.discussion_title || "";
    switch (n.type) {
      case "copany_starred": {
        const name = n.copany_id ? copanies[String(n.copany_id)]?.name : "";
        return name ? (
          <span className="text-sm">{`Copany: ${name}`}</span>
        ) : null;
      }
      case "comment_reply":
        return (
          <span className="text-sm">
            {latestTitle ? `Issue ${latestTitle}` : "Issue"}
          </span>
        );
      case "new_comment":
        return (
          <span className="text-sm">
            {latestTitle ? `Issue ${latestTitle}` : "Issue"}
          </span>
        );
      case "new_issue":
        return (
          <span className="text-sm">
            {latestTitle ? `Issue ${latestTitle}` : "Issue"}
          </span>
        );
      case "mention":
        return (
          <span className="text-sm">
            {latestTitle ? `Issue ${latestTitle}` : "Issue"}
          </span>
        );
      case "issue_assigned":
        return (
          <span className="text-sm">
            {latestTitle ? `Issue ${latestTitle}: ` : "Issue "}
            {`@${p.from_user_name}`} → {`@${p.to_user_name}`}
          </span>
        );
      case "issue_state_changed":
        return (
          <span className="text-sm ">
            {latestTitle ? `Issue ${latestTitle}: ` : "Issue "}
            {getStateName(p.from_state)} → {getStateName(p.to_state)}
          </span>
        );
      case "issue_priority_changed":
        return (
          <span className="text-sm">
            {latestTitle ? `Issue ${latestTitle}: ` : "Issue "}
            {getPriorityName(p.from_priority)} →{" "}
            {getPriorityName(p.to_priority)}
          </span>
        );
      case "issue_level_changed":
        return (
          <span className="text-sm">
            {latestTitle ? `Issue ${latestTitle}: ` : "Issue "}
            {getLevelName(p.from_level)} → {getLevelName(p.to_level)}
          </span>
        );
      case "issue_closed":
        return (
          <span className="text-sm">
            {latestTitle ? `Issue ${latestTitle}` : "Issue"}
          </span>
        );
      case "assignment_request_received":
        return (
          <span className="text-sm">
            {latestTitle ? `Issue ${latestTitle}` : "Issue"}
          </span>
        );
      case "assignment_request_accepted":
        return (
          <span className="text-sm">
            {latestTitle ? `Issue ${latestTitle}: ` : "Issue "}Your request was
            accepted
          </span>
        );
      case "assignment_request_refused":
        return (
          <span className="text-sm">
            {latestTitle ? `Issue ${latestTitle}: ` : "Issue "}Your request was
            refused
          </span>
        );
      case "review_requested":
        return (
          <span className="text-sm">
            {latestTitle ? `Issue ${latestTitle}: ` : "Issue "}You were
            requested to review
          </span>
        );
      case "review_approved":
        return (
          <span className="text-sm">
            {latestTitle ? `Issue ${latestTitle}: ` : "Issue "}Review approved
          </span>
        );
      case "discussion_created":
        return (
          <span className="text-sm">
            {latestTitle ? `Discussion ${latestTitle}` : "Discussion"}
          </span>
        );
      case "discussion_voted":
        return (
          <span className="text-sm">
            {latestTitle ? `Discussion ${latestTitle}` : "Discussion"}
          </span>
        );
      case "discussion_comment_created":
        return (
          <span className="text-sm">
            {latestTitle ? `Discussion ${latestTitle}` : "Discussion"}
          </span>
        );
      case "discussion_comment_voted":
        return (
          <span className="text-sm">
            {latestTitle ? `Discussion ${latestTitle}` : "Discussion"}
          </span>
        );
      case "discussion_comment_reply":
        return (
          <span className="text-sm">
            {latestTitle ? `Discussion ${latestTitle}` : "Discussion"}
          </span>
        );
      case "distribute_created":
      case "distribute_submitted":
      case "distribute_confirmed":
        return (
          <span className="text-sm">
            {String(n.payload?.currency || "")}{" "}
            {Number(n.payload?.amount || 0).toFixed(2)}
            {n.payload?.contribution_percent
              ? ` (${String(n.payload.contribution_percent)}%)`
              : ""}
          </span>
        );
      case "transaction_created":
      case "transaction_confirmed":
        return (
          <span className="text-sm">
            Transaction: {String(n.payload?.type) === "income" ? "+" : "-"}
            {String(n.payload?.currency || "")}{" "}
            {Number(n.payload?.amount || 0).toFixed(2)}
            {n.payload?.description
              ? ` - ${String(n.payload.description)}`
              : ""}
          </span>
        );
      default: {
        if (!latestTitle) return null;
        // Determine prefix based on whether it's an issue or discussion
        if (n.issue_id || p.issue_title) {
          return <span className="text-sm">{`Issue ${latestTitle}`}</span>;
        } else if (n.discussion_id || p.discussion_title) {
          return <span className="text-sm">{`Discussion ${latestTitle}`}</span>;
        }
        return <span className="text-sm">{latestTitle}</span>;
      }
    }
  };

  const renderActionIcon = (n: Notification): React.ReactNode => {
    switch (n.type) {
      case "copany_starred":
        return <StarIcon className="w-6 h-6 text-[#FF9D0B]" />;
      case "comment_reply":
        return (
          <UserGroupIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "new_comment":
        return (
          <UserGroupIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "new_issue":
        return (
          <UserGroupIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "mention":
        return (
          <UserGroupIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "issue_assigned":
        return (
          <UserGroupIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "issue_state_changed":
        return (
          <div className="w-6 h-6 flex items-center justify-center scale-125">
            {renderStateLabel(n.payload?.to_state ?? null, false, true)}
          </div>
        );
      case "issue_priority_changed":
        return (
          <div className="w-6 h-6 flex items-center justify-center scale-125">
            {renderPriorityLabel(n.payload?.to_priority ?? null, false)}
          </div>
        );
      case "issue_level_changed":
        return (
          <div className="w-6 h-6 flex items-center justify-center scale-125">
            {renderLevelLabel(n.payload?.to_level ?? null, false, false)}
          </div>
        );
      case "issue_closed":
        return (
          <UserGroupIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "assignment_request_received":
        return (
          <HandRaisedIcon className="w-6 h-6 text-gray-900 dark:text-gray-100 -rotate-30 " />
        );
      case "assignment_request_accepted":
        return (
          <UserGroupIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "assignment_request_refused":
        return (
          <UserGroupIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "review_requested":
        return (
          <UserGroupIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "review_approved":
        return (
          <UserGroupIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "discussion_created":
        return (
          <ChatBubbleLeftRightIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "discussion_voted":
        return isDarkMode ? (
          <ArrowshapeUpFillDarkIcon className="w-6 h-6" />
        ) : (
          <ArrowshapeUpFillIcon className="w-6 h-6" />
        );
      case "discussion_comment_created":
        return (
          <ChatBubbleLeftRightIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "discussion_comment_voted":
        return isDarkMode ? (
          <ArrowshapeUpFillDarkIcon className="w-6 h-6" />
        ) : (
          <ArrowshapeUpFillIcon className="w-6 h-6" />
        );
      case "discussion_comment_reply":
        return (
          <ChatBubbleLeftRightIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "distribute_created":
        return (
          <ReceiptPercentIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "distribute_submitted":
        return (
          <ReceiptPercentIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "distribute_confirmed":
        return (
          <ReceiptPercentIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "transaction_created":
        return (
          <ReceiptPercentIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      case "transaction_confirmed":
        return (
          <ReceiptPercentIcon className="w-6 h-6 text-gray-900 dark:text-gray-100" />
        );
      default:
        return null;
    }
  };

  const renderItem = (n: Notification) => {
    const actionIcon: React.ReactNode = renderActionIcon(n);

    const avator: React.ReactNode = (
      <div className="relative w-8 h-8">
        {n.actor_id && actorUsers[n.actor_id]?.avatar_url ? (
          <div className="flex w-8 h-8">
            <UserAvatar
              userId={n.actor_id}
              name={actorUsers[n.actor_id]!.name || ""}
              avatarUrl={actorUsers[n.actor_id]!.avatar_url}
              email={actorUsers[n.actor_id]!.email}
              size="lg"
              showTooltip={true}
            />
          </div>
        ) : (
          <div className="flex w-8 h-8">
            {n.copany_id && copanies[String(n.copany_id)]?.logo_url ? (
              <Image
                src={copanies[String(n.copany_id)]!.logo_url as string}
                alt="Copany"
                className="w-8 h-8 rounded-sm"
                width={32}
                height={32}
                placeholder="blur"
                blurDataURL={shimmerDataUrlWithTheme(32, 32, isDarkMode)}
              />
            ) : n.copany_id && copanies[String(n.copany_id)]?.name ? (
              <div className="w-8 h-8 rounded-sm bg-[#FBF9F5] dark:bg-[#323231] border border-white dark:border-gray-700 flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-300 font-semibold">
                {copanies[String(n.copany_id)]?.name?.slice(0, 2) || ""}
              </div>
            ) : null}
          </div>
        )}
      </div>
    );

    return (
      <button
        key={n.id}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openTarget(n);
        }}
        className="w-full text-left pl-2 pr-3 py-2 hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 rounded-md"
      >
        <div className="flex flex-col gap-1">
          <div className="flex flex-col md:flex-row md:items-cente gap-1 w-full">
            <div className="flex items-center gap-2 w-full">
              <div className="flex items-center justify-center w-8 h-8">
                <div className="flex items-center w-8 h-8 justify-center">
                  {actionIcon ? actionIcon : avator}
                </div>
              </div>
              {actionIcon ? avator : null}
              <div className="flex flex-col gap-0 w-full">
                <div className="flex flex-row gap-2 justify-between items-center w-full">
                  <span className="text-base font-semibold text-gray-700 dark:text-gray-300">
                    {n.actor_id && actorUsers[n.actor_id]
                      ? actorUsers[n.actor_id].name
                      : n.copany_id && copanies[String(n.copany_id)]?.name}
                  </span>
                  <span className="ml-auto text-base text-gray-400">
                    {formatRelativeTime(n.created_at)}
                  </span>
                  {n.copany_id && copanies[String(n.copany_id)]?.logo_url ? (
                    <Image
                      src={copanies[String(n.copany_id)]!.logo_url as string}
                      alt="Copany"
                      className="w-5 h-5 rounded-sm"
                      width={20}
                      height={20}
                      placeholder="blur"
                      blurDataURL={shimmerDataUrlWithTheme(20, 20, isDarkMode)}
                    />
                  ) : n.copany_id && copanies[String(n.copany_id)]?.name ? (
                    <div className="w-5 h-5 rounded-sm bg-[#FBF9F5] dark:bg-[#323231] border border-white dark:border-gray-700 flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-300 font-semibold">
                      {copanies[String(n.copany_id)]?.name?.slice(0, 2) || ""}
                    </div>
                  ) : null}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {simpleText(n)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col pl-10">
            {renderSecondaryLine(n)}
            {n.payload?.preview && (
              <span className="text-sm line-clamp-2">{n.payload.preview}</span>
            )}
          </div>
        </div>
      </button>
    );
  };

  const computePanelGeometry = (): {
    top: number;
    left: number;
    width: number;
  } | null => {
    if (!buttonRef.current) return null;
    const rect = buttonRef.current.getBoundingClientRect();
    const maxWidth = 420;
    const safeMarginX = 8;
    const verticalGap = 4;
    const viewportWidth =
      document.documentElement.clientWidth || window.innerWidth;
    const width = Math.max(
      260,
      Math.min(maxWidth, viewportWidth - safeMarginX * 2)
    );
    const maxLeft = viewportWidth - safeMarginX - width;
    const desiredLeft = rect.right - width;
    const left = Math.max(safeMarginX, Math.min(maxLeft, desiredLeft));
    const top = rect.bottom + verticalGap;
    return { top, left, width };
  };

  const togglePanel = () => {
    if (isOpen) {
      closePanel();
    } else {
      setIsOpen(true);
      markAllRead();
      const geo = computePanelGeometry();
      if (geo) setPanelPosition(geo);
    }
  };

  const closePanel = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        closePanel();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("click", handler, true);
    document.addEventListener("keydown", onKey);
    const onResize = () => {
      const geo = computePanelGeometry();
      if (geo) setPanelPosition(geo);
    };
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("click", handler, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={buttonRef}>
      <Button
        size="sm"
        variant="ghost"
        shape="square"
        className="p-1 -ml-1"
        onClick={(e) => {
          e.stopPropagation();
          togglePanel();
        }}
      >
        <BellIcon unreadCount={unreadCount} />
      </Button>

      {isOpen &&
        panelPosition &&
        mounted &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[100] pt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg box-border"
            style={{
              top: panelPosition.top,
              left: panelPosition.left,
              width: panelPosition.width,
            }}
          >
            <div className="px-4 pt-1 pb-2 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
              <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Notifications
              </div>
              <Button
                size="sm"
                variant="ghost"
                shape="square"
                className="-mr-2"
                onClick={(e) => {
                  e.stopPropagation();
                  closePanel();
                }}
              >
                <XMarkIcon className="w-4 h-4" />
              </Button>
            </div>
            <div
              className="py-2 max-h-128 overflow-y-auto p-2"
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
                  fetchMore();
                }
              }}
            >
              {list.map(renderItem)}
              {list.length === 0 && (
                <div className="px-2 py-4 text-base text-gray-500 dark:text-gray-400">
                  No notifications
                </div>
              )}
              {isLoadingMore && (
                <div className="flex justify-center mt-4">
                  <LoadingView type="label" />
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
