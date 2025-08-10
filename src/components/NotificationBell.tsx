"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import type { Notification } from "@/types/database.types";
import { IssueState, IssuePriority, IssueLevel } from "@/types/database.types";
import Button from "./commons/Button";
import { useRouter } from "next/navigation";
import { BellAlertIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { userInfoManager } from "@/utils/cache/managers/UserInfoManager";
import type { UserInfo } from "@/actions/user.actions";
import { issuesManager } from "@/utils/cache/managers/IssuesManager";

function BellIcon({ hasUnread }: { hasUnread: boolean }) {
  return (
    <div className="relative">
      <BellAlertIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      {hasUnread && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
      )}
    </div>
  );
}

export default function NotificationBell() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [actorUsers, setActorUsers] = useState<Record<string, UserInfo>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    const { count, error } = await supabase
      .from("notification")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    if (!error) setUnreadCount(count || 0);
  };

  const fetchList = async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("notification")
      .select("*, issue:issue_id(title)")
      .order("is_read", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) setNotifications(data as Notification[]);
    setLoadingList(false);
  };

  const loadActorUsers = async (items: Notification[]) => {
    const ids = Array.from(
      new Set(
        items
          .map((n) => n.actor_id)
          .filter((v): v is string => typeof v === "string" && v.length > 0)
      )
    );
    if (ids.length === 0) return;
    // 仅加载缺失的用户信息
    const missing = ids.filter((id) => !actorUsers[id]);
    if (missing.length === 0) return;
    const users = await userInfoManager.getMultipleUserInfo(missing);
    setActorUsers((prev) => ({ ...prev, ...users }));
  };

  const markAllRead = async () => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notification")
      .update({ read_at: now })
      .is("read_at", null);
    if (!error) {
      // 本地更新，避免立即触发重新拉取导致闪烁
      setNotifications((prev) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: now, is_read: true }))
      );
      setUnreadCount(0);
    }
  };

  const markOneRead = async (id: string) => {
    const { error } = await supabase
      .from("notification")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, read_at: new Date().toISOString(), is_read: true }
            : n
        )
      );
      await fetchUnreadCount();
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    fetchList();
    const t1 = setInterval(fetchUnreadCount, 30000);
    const t2 = setInterval(fetchList, 30000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, []);

  // 当通知列表变化时加载对应的触发者用户信息
  useEffect(() => {
    if (notifications.length > 0) {
      loadActorUsers(notifications);
    }
  }, [notifications]);

  // Dropdown options: render list items as ReactNode; value is index
  const header = (
    <div className="flex items-center justify-between gap-2">
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Notifications
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {unreadCount > 0 ? `${unreadCount} 未读` : "已全部读"}
        </span>
        <Button size="sm" variant="ghost" onClick={markAllRead}>
          全部已读
        </Button>
      </div>
    </div>
  );

  const simpleText = (n: Notification) => {
    switch (n.type) {
      case "comment_reply":
        return "replied to you";
      case "new_comment":
        return "commented in the Issue";
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
      default:
        return "Notification";
    }
  };

  const openTarget = async (n: Notification) => {
    // 标记已读并跳转
    await markOneRead(n.id);
    if (n.issue_id) {
      const anchor = n.comment_id ? `#comment-${n.comment_id}` : "";
      router.push(`/copany/${n.copany_id}/issue/${n.issue_id}${anchor}`);
    } else if (n.copany_id) {
      router.push(`/copany/${n.copany_id}`);
    }
  };

  const getStateName = (v: any): string => {
    const value = typeof v === "number" ? v : Number(v);
    switch (value) {
      case IssueState.Backlog:
        return "Backlog";
      case IssueState.Todo:
        return "Todo";
      case IssueState.InProgress:
        return "In Progress";
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

  const getPriorityName = (v: any): string => {
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

  const getLevelName = (v: any): string => {
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

  const renderSecondaryLine = (n: Notification) => {
    const p = n.payload || {};
    // 优先从 Issues 缓存获取标题，其次用联表标题，再次回退 payload 快照
    let latestTitle = "";
    if (n.copany_id && n.issue_id) {
      const cached = issuesManager.getIssue(
        String(n.copany_id),
        String(n.issue_id)
      );
      latestTitle = cached?.title || "";
    }
    if (!latestTitle) {
      latestTitle = (n as any)?.issue?.title || p.issue_title || "";
    }
    switch (n.type) {
      case "issue_assigned":
        return (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {latestTitle ? `${latestTitle}: ` : ""}
            {p.from_user_name || "Unassigned"} →{" "}
            {p.to_user_name || "Unassigned"}
          </span>
        );
      case "issue_state_changed":
        return (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {latestTitle ? `${latestTitle}: ` : ""}
            {getStateName(p.from_state)} → {getStateName(p.to_state)}
          </span>
        );
      case "issue_priority_changed":
        return (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {latestTitle ? `${latestTitle}: ` : ""}
            {getPriorityName(p.from_priority)} →{" "}
            {getPriorityName(p.to_priority)}
          </span>
        );
      case "issue_level_changed":
        return (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {latestTitle ? `${latestTitle}: ` : ""}
            {getLevelName(p.from_level)} → {getLevelName(p.to_level)}
          </span>
        );
      case "issue_closed":
        return (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {latestTitle || "Issue"}
          </span>
        );
      default:
        return latestTitle ? (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {latestTitle}
          </span>
        ) : null;
    }
  };

  const renderItem = (n: Notification, idx: number) => (
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
        <div className="flex items-center gap-2">
          {n.actor_id && actorUsers[n.actor_id]?.avatar_url ? (
            <Image
              src={actorUsers[n.actor_id]!.avatar_url}
              alt={actorUsers[n.actor_id]!.name || "User"}
              className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700"
              width={20}
              height={20}
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-300">
              {actorUsers[n.actor_id || ""]?.name?.[0]?.toUpperCase() || "S"}
            </div>
          )}
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {n.actor_id && actorUsers[n.actor_id]
              ? actorUsers[n.actor_id].name
              : "System"}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {simpleText(n)}
          </span>
        </div>
        {renderSecondaryLine(n)}
        {n.payload?.preview && (
          <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {n.payload.preview}
          </span>
        )}
      </div>
    </button>
  );

  const openPanel = () => {
    setIsOpen(true);
    // 打开即标记全部已读
    markAllRead();
    // 定位到触发按钮
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = 320;
      const left = Math.min(
        window.innerWidth - 8 - width,
        Math.max(8, rect.right - width)
      );
      const top = rect.bottom + 8;
      setPanelPosition({ top, left, width });
    }
  };

  const closePanel = () => setIsOpen(false);

  // 点击外部关闭
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
    return () => {
      document.removeEventListener("click", handler, true);
      document.removeEventListener("keydown", onKey);
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
          openPanel();
        }}
      >
        <BellIcon hasUnread={unreadCount > 0} />
      </Button>

      {isOpen && panelPosition && (
        <div
          ref={panelRef}
          className="fixed z-50 my-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg w-80"
          style={{ top: panelPosition.top, left: panelPosition.left }}
        >
          <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                shape="square"
                onClick={(e) => {
                  e.stopPropagation();
                  closePanel();
                }}
              >
                <XMarkIcon className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>
          <div className="py-1 max-h-128 overflow-y-auto">
            {(loadingList ? [] : notifications).map(renderItem)}
            {!loadingList && notifications.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
