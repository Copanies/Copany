"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type {
  Notification,
  NotificationPayload,
  Copany,
} from "@/types/database.types";
import { IssueState, IssuePriority, IssueLevel } from "@/types/database.types";
import Button from "./Button";
import { useRouter } from "next/navigation";
import { BellAlertIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useUsersInfo } from "@/hooks/userInfo";
import { formatRelativeTime } from "@/utils/time";
import type { UserInfo } from "@/actions/user.actions";
import { useNotifications, useMarkNotifications } from "@/hooks/notifications";
import { getCopanyByIdAction } from "@/actions/copany.actions";
import { listNotificationsAction } from "@/actions/notification.actions";
import { formatAbbreviatedCount } from "@/utils/number";

// Stable empty array to avoid re-creating [] on every render,
// which would otherwise retrigger effects depending on it
const EMPTY_NOTIFICATIONS: Notification[] = [];

function BellIcon({ unreadCount }: { unreadCount: number }) {
  return (
    <div className="relative flex flex-row gap-2">
      <BellAlertIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 inline-flex px-[4.2px] h-[19px] items-center justify-center bg-red-500 border-2 border-white text-white rounded-full text-xs font-medium">
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

  // Local list for pagination-append
  const [list, setList] = useState<Notification[]>(EMPTY_NOTIFICATIONS);
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
        return value || value === 0 ? String(value) : "Unknown";
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
        return value || value === 0 ? String(value) : "Unknown";
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
        return value || value === 0 ? String(value) : "Unknown";
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
        return name ? <span className="text-sm">{name}</span> : null;
      }
      case "issue_assigned":
        return (
          <span className="text-sm">
            {latestTitle ? `"${latestTitle}": ` : ""}
            {`@${p.from_user_name}`} → {`@${p.to_user_name}`}
          </span>
        );
      case "issue_state_changed":
        return (
          <span className="text-sm ">
            {latestTitle ? `"${latestTitle}": ` : ""}
            {getStateName(p.from_state)} → {getStateName(p.to_state)}
          </span>
        );
      case "issue_priority_changed":
        return (
          <span className="text-sm">
            {latestTitle ? `"${latestTitle}": ` : ""}
            {getPriorityName(p.from_priority)} →{" "}
            {getPriorityName(p.to_priority)}
          </span>
        );
      case "issue_level_changed":
        return (
          <span className="text-sm">
            {latestTitle ? `"${latestTitle}": ` : ""}
            {getLevelName(p.from_level)} → {getLevelName(p.to_level)}
          </span>
        );
      case "issue_closed":
        return <span className="text-sm">{latestTitle || "Issue"}</span>;
      case "assignment_request_received":
        return (
          <span className="text-sm">{latestTitle ? latestTitle : "Issue"}</span>
        );
      case "assignment_request_accepted":
        return (
          <span className="text-sm">
            {latestTitle ? `${latestTitle}: ` : ""}Your request was accepted
          </span>
        );
      case "assignment_request_refused":
        return (
          <span className="text-sm">
            {latestTitle ? `${latestTitle}: ` : ""}Your request was refused
          </span>
        );
      case "review_requested":
        return (
          <span className="text-sm">
            {latestTitle ? `${latestTitle}: ` : ""}You were requested to review
          </span>
        );
      case "review_approved":
        return (
          <span className="text-sm">
            {latestTitle ? `${latestTitle}: ` : ""}Review approved
          </span>
        );
      case "discussion_created":
        return <span className="text-sm">{latestTitle || "Discussion"}</span>;
      case "discussion_voted":
        return <span className="text-sm">{latestTitle || "Discussion"}</span>;
      case "discussion_comment_created":
        return <span className="text-sm">{latestTitle || "Discussion"}</span>;
      case "discussion_comment_voted":
        return <span className="text-sm">{latestTitle || "Discussion"}</span>;
      case "discussion_comment_reply":
        return <span className="text-sm">{latestTitle || "Discussion"}</span>;
      default:
        return latestTitle ? (
          <span className="text-sm">{latestTitle}</span>
        ) : null;
    }
  };

  const renderItem = (n: Notification) => (
    <button
      key={n.id}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openTarget(n);
      }}
      className="w-full text-left px-3 py-2 hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 rounded-md"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-col md:flex-row md:items-center md:gap-2 gap-1 w-full">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-9 h-8">
              {n.actor_id && actorUsers[n.actor_id]?.avatar_url ? (
                <Image
                  src={actorUsers[n.actor_id]!.avatar_url}
                  alt={actorUsers[n.actor_id]!.name || "User"}
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700"
                  width={24}
                  height={24}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-300">
                  {actorUsers[n.actor_id || ""]?.name?.[0]?.toUpperCase() ||
                    "S"}
                </div>
              )}
              {n.copany_id && copanies[String(n.copany_id)]?.logo_url ? (
                <Image
                  src={copanies[String(n.copany_id)]!.logo_url as string}
                  alt="Copany"
                  className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-1 border-white dark:border-gray-700"
                  width={20}
                  height={20}
                />
              ) : null}
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {n.actor_id && actorUsers[n.actor_id]
                ? actorUsers[n.actor_id].name
                : "System"}
            </span>
            <span className="ml-auto text-sm text-gray-400 md:hidden">
              {formatRelativeTime(n.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-2 md:flex-1">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {simpleText(n)}
            </span>
            <span className="hidden md:inline md:ml-auto text-sm text-gray-400">
              {formatRelativeTime(n.created_at)}
            </span>
          </div>
        </div>
        {renderSecondaryLine(n)}
        {n.payload?.preview && (
          <span className="text-sm line-clamp-2">{n.payload.preview}</span>
        )}
      </div>
    </button>
  );

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

      {isOpen && panelPosition && (
        <div
          ref={panelRef}
          className="fixed z-50 pt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg box-border"
          style={{
            top: panelPosition.top,
            left: panelPosition.left,
            width: panelPosition.width,
          }}
        >
          <div className="px-4 py-1 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
              <XMarkIcon className="w-4 h-4 text-gray-500" />
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
              <div className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            )}
            {isLoadingMore && (
              <div className="px-2 py-2 text-sm text-gray-400">Loading…</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
