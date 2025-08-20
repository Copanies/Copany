"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Modal from "@/components/commons/Modal";
import ContextMenu, { ContextMenuItem } from "@/components/commons/ContextMenu";
import { deleteIssueAction } from "@/actions/issue.actions";
import {
  IssueWithAssignee,
  IssuePriority,
  IssueState,
  CopanyContributor,
  AssigneeUser,
} from "@/types/database.types";
import IssueStateSelector from "@/components/IssueStateSelector";
import IssuePrioritySelector from "@/components/IssuePrioritySelector";
import IssueAssigneeSelector from "@/components/IssueAssigneeSelector";
import Button from "@/components/commons/Button";
import LoadingView from "@/components/commons/LoadingView";
import { renderStateLabel } from "@/components/IssueStateSelector";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { InboxStackIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  currentUserManager,
  contributorsManager,
  issuesUiStateManager,
} from "@/utils/cache";
import IssueLevelSelector from "@/components/IssueLevelSelector";
import IssueCreateForm from "@/components/IssueCreateForm";
import { User } from "@supabase/supabase-js";
import { listIssueReviewersAction } from "@/actions/issueReviewer.actions";
import {
  listAssignmentRequestsAction,
  listAssignmentRequestsByCopanyAction,
} from "@/actions/assignmentRequest.actions";
import type { IssueReviewer } from "@/types/database.types";
import { CheckIcon } from "@heroicons/react/20/solid";
import {
  issuePermissionManager,
  issueReviewersManager,
  assignmentRequestsManager,
  userInfoManager,
} from "@/utils/cache";
import * as Tooltip from "@radix-ui/react-tooltip";
import { HandRaisedIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import type { AssignmentRequest } from "@/types/database.types";
import type { UserInfo } from "@/actions/user.actions";
import { useIssues } from "@/hooks/issues";
import { useQueryClient } from "@tanstack/react-query";

// Function to group issues by state
function groupIssuesByState(issues: IssueWithAssignee[]) {
  const grouped = issues.reduce((acc, issue) => {
    let state = issue.state || IssueState.Backlog;

    // Merge Duplicate state into Canceled group
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

  // For Done / Canceled (including Duplicate merged) groups, sort by closed_at desc
  const sortByClosedAtDesc = (a: IssueWithAssignee, b: IssueWithAssignee) => {
    const aTime = a.closed_at ? new Date(a.closed_at).getTime() : 0;
    const bTime = b.closed_at ? new Date(b.closed_at).getTime() : 0;
    return bTime - aTime;
  };

  // Sort by state order
  const stateOrder = [
    IssueState.InReview,
    IssueState.InProgress,
    IssueState.Todo,
    IssueState.Backlog,
    IssueState.Done,
    IssueState.Canceled,
  ];

  return stateOrder
    .filter((state) => grouped[state] && grouped[state].length > 0)
    .map((state) => ({
      state,
      label: renderStateLabel(state, true, true),
      issues:
        state === IssueState.Done || state === IssueState.Canceled
          ? grouped[state].slice().sort(sortByClosedAtDesc)
          : grouped[state].slice().sort(sortByPriority),
    }));
}

export default function IssuesView({ copanyId }: { copanyId: string }) {
  const { data: issuesData, isLoading: isIssuesLoading } = useIssues(copanyId);
  const issues = issuesData || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    issueId: string;
  }>({ show: false, x: 0, y: 0, issueId: "" });

  // Add shared user and contributor status
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [contributors, setContributors] = useState<CopanyContributor[]>([]);
  const [canEditByIssue, setCanEditByIssue] = useState<Record<string, boolean>>(
    {}
  );
  // cache reviewers per issue for lightweight list indicators
  const [reviewersByIssue, setReviewersByIssue] = useState<
    Record<string, IssueReviewer[]>
  >({});
  const loadingReviewersRef = useRef<Set<string>>(new Set());
  // assignment requests (in-progress) per issue → requester ids
  const [pendingRequestersByIssue, setPendingRequestersByIssue] = useState<
    Record<string, string[]>
  >({});
  const loadingPendingRequestsRef = useRef<Set<string>>(new Set());
  const [requestersInfo, setRequestersInfo] = useState<
    Record<string, UserInfo>
  >({});
  // 标记本地变更与缓存同步，避免在 render 阶段触发事件回流导致 setState 警告
  const isLocalUpdateRef = useRef(false);
  const isSyncingToCacheRef = useRef(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Search query state synced with URL ?q=
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get("q") ?? ""
  );
  useEffect(() => {
    setSearchQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  // Collapsible group states via cache manager
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<number, boolean>
  >(() => issuesUiStateManager.getCollapsedGroups(copanyId));

  const toggleGroupCollapse = useCallback(
    (state: number) => {
      setCollapsedGroups((prev) => {
        const next = { ...prev, [state]: !prev[state] } as Record<
          number,
          boolean
        >;
        issuesUiStateManager.setCollapsedGroups(copanyId, next);
        return next;
      });
    },
    [copanyId]
  );

  // When copanyId changes, reload UI state from cache (CSR only)
  useEffect(() => {
    setCollapsedGroups(issuesUiStateManager.getCollapsedGroups(copanyId));
  }, [copanyId]);

  // Function to load user and contributor data
  const loadUserData = useCallback(async () => {
    try {
      const [user, contributorList] = await Promise.all([
        currentUserManager.getCurrentUser(),
        contributorsManager.getContributors(copanyId),
      ]);

      setCurrentUser(user);
      setContributors(contributorList);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, [copanyId]);

  // Load data when component mounts
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Compute per-issue permissions for current list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = await Promise.all(
          issues.map(async (it) => {
            const allowed = await issuePermissionManager.canEditIssue(
              copanyId,
              it
            );
            return [String(it.id), !!allowed] as const;
          })
        );
        if (cancelled) return;
        const map: Record<string, boolean> = {};
        for (const [id, allowed] of entries) map[id] = allowed;
        setCanEditByIssue(map);
      } catch (_) {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [issues, copanyId]);

  // NOTE: lazy reviewers loading is defined below after filteredIssues

  const renderReviewBadge = (issue: IssueWithAssignee) => {
    if (issue.state !== IssueState.InReview) return null;
    const list = reviewersByIssue[String(issue.id)] || [];
    if (list.length === 0) return null;
    const meId = currentUser?.id ? String(currentUser.id) : null;
    const hasApproved = list.some((r) => r.status === "approved");
    const needsMyReview = !!(
      meId &&
      list.some(
        (r) => String(r.reviewer_id) === meId && r.status === "requested"
      )
    );
    if (hasApproved) {
      return (
        <div className="flex flex-row items-center gap-1">
          <CheckIcon className="w-4 h-4 text-[#058E00]" />
          <span className="text-gray-500 dark:text-gray-400 hidden md:block">
            approved
          </span>
        </div>
      );
    } else if (needsMyReview) {
      return (
        <div className="flex flex-row items-center gap-1">
          <div className="w-4 h-4 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-yellow-600" />
          </div>
          <span className="text-gray-500 dark:text-gray-400 hidden md:block">
            needs your review
          </span>
        </div>
      );
    } else {
      return null;
    }
  };

  // Filtered issues by search query
  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return issues;
    return issues.filter((issue) => {
      const title = (issue.title || "").toLowerCase();
      const idStr = String(issue.id || "");
      return title.includes(q) || idStr.includes(q);
    });
  }, [issues, searchQuery]);

  // Lazy load reviewers for currently visible InReview issues
  useEffect(() => {
    const target = filteredIssues
      .filter((it) => it.state === IssueState.InReview)
      .map((it) => String(it.id));
    const missing = target.filter(
      (id) =>
        reviewersByIssue[id] === undefined &&
        !loadingReviewersRef.current.has(id)
    );
    if (missing.length === 0) return;
    // mark loading to avoid duplicate requests
    missing.forEach((id) => loadingReviewersRef.current.add(id));
    (async () => {
      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              const rs = await issueReviewersManager.getReviewers(id, () =>
                listIssueReviewersAction(id)
              );
              return [id, rs] as const;
            } catch (e) {
              console.error("Failed to load reviewers", { id, e });
              return [id, [] as IssueReviewer[]] as const;
            }
          })
        );
        setReviewersByIssue((prev) => {
          const next = { ...prev } as Record<string, IssueReviewer[]>;
          for (const [id, rs] of results) next[id] = rs;
          return next;
        });
      } finally {
        missing.forEach((id) => loadingReviewersRef.current.delete(id));
      }
    })();
  }, [filteredIssues, reviewersByIssue]);

  // Lazy load in-progress assignment request requesters for visible issues (fetch by copany once)
  useEffect(() => {
    const targetIssueIds = filteredIssues.map((it) => String(it.id));
    const missing = targetIssueIds.filter(
      (id) =>
        pendingRequestersByIssue[id] === undefined &&
        !loadingPendingRequestsRef.current.has(id)
    );
    if (missing.length === 0) return;
    // 标记这些 issueId 正在加载，避免重复请求
    missing.forEach((id) => loadingPendingRequestsRef.current.add(id));
    (async () => {
      try {
        // 统一按 copany 拉取所有申请记录（通过缓存管理器）
        const all = await assignmentRequestsManager.getRequestsByCopany(
          copanyId,
          () => listAssignmentRequestsByCopanyAction(copanyId)
        );
        // 根据 issue_id 分组（用于下方徽标计算）
        const byIssue: Record<string, AssignmentRequest[]> = {};
        for (const it of all) {
          const key = String(it.issue_id);
          if (!byIssue[key]) byIssue[key] = [];
          byIssue[key].push(it);
        }

        // 仅为当前缺失的 issue 计算徽标所需的 in-progress requester ids
        const nextPending: Record<string, string[]> = {};
        const userIdSet = new Set<string>();
        for (const issueId of missing) {
          const list = byIssue[issueId] || [];
          const byRequester = new Map<string, AssignmentRequest[]>();
          const sorted = [...list].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );
          for (const it of sorted) {
            const key = String(it.requester_id);
            if (!byRequester.has(key)) byRequester.set(key, []);
            byRequester.get(key)!.push(it);
          }
          const inProgress: string[] = [];
          for (const [rid, items] of byRequester.entries()) {
            const lastTerminalAt = items
              .filter(
                (r) =>
                  r.status === "accepted" ||
                  r.status === "refused" ||
                  r.status === "skipped"
              )
              .reduce<string | null>((acc, r) => {
                const t = r.updated_at || r.created_at;
                if (!acc) return t;
                return new Date(t).getTime() > new Date(acc).getTime()
                  ? t
                  : acc;
              }, null);
            const currentBatch = items.filter((r) =>
              lastTerminalAt
                ? new Date(r.created_at).getTime() >
                  new Date(lastTerminalAt).getTime()
                : true
            );
            if (
              currentBatch.length > 0 &&
              currentBatch.every((r) => r.status === "requested")
            ) {
              inProgress.push(rid);
              userIdSet.add(rid);
            }
          }
          nextPending[issueId] = inProgress;
        }

        setPendingRequestersByIssue((prev) => ({ ...prev, ...nextPending }));
        if (userIdSet.size > 0) {
          try {
            const infos = await userInfoManager.getMultipleUserInfo(
              Array.from(userIdSet)
            );
            setRequestersInfo((prev) => ({ ...prev, ...infos }));
          } catch (e) {
            console.error("Failed to load requester user infos", e);
          }
        }
      } finally {
        missing.forEach((id) => loadingPendingRequestsRef.current.delete(id));
      }
    })();
  }, [filteredIssues, pendingRequestersByIssue, copanyId]);

  // 订阅各类缓存的后台刷新事件，自动联动本页 UI（非 Issues 相关仍保留）
  useEffect(() => {
    const computePendingRequestersForIssue = (
      list: AssignmentRequest[]
    ): string[] => {
      const byRequester = new Map<string, AssignmentRequest[]>();
      const sorted = [...list].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      for (const it of sorted) {
        const key = String(it.requester_id);
        if (!byRequester.has(key)) byRequester.set(key, []);
        byRequester.get(key)!.push(it);
      }
      const inProgress: string[] = [];
      for (const [rid, items] of byRequester.entries()) {
        const lastTerminalAt = items
          .filter(
            (r) =>
              r.status === "accepted" ||
              r.status === "refused" ||
              r.status === "skipped"
          )
          .reduce<string | null>((acc, r) => {
            const t = r.updated_at || r.created_at;
            if (!acc) return t;
            return new Date(t).getTime() > new Date(acc).getTime() ? t : acc;
          }, null);
        const currentBatch = items.filter((r) =>
          lastTerminalAt
            ? new Date(r.created_at).getTime() >
              new Date(lastTerminalAt).getTime()
            : true
        );
        if (
          currentBatch.length > 0 &&
          currentBatch.every((r) => r.status === "requested")
        ) {
          inProgress.push(rid);
        }
      }
      return inProgress;
    };

    const onCacheUpdated = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as {
          manager: string;
          key: string;
          data: unknown;
        };
        if (!detail) return;

        // Issues 列表由 React Query 管理

        // Contributors：同 copanyId 时刷新指派下拉可选项
        if (
          detail.manager === "ContributorsManager" &&
          detail.key === copanyId
        ) {
          setContributors(
            Array.isArray(detail.data)
              ? (detail.data as CopanyContributor[])
              : []
          );
          return;
        }

        // Reviewers：key 为 issueId，更新徽标数据映射
        if (detail.manager === "IssueReviewersManager") {
          const issueId = String(detail.key);
          const list = (detail.data as IssueReviewer[]) || [];
          setReviewersByIssue((prev) => ({ ...prev, [issueId]: list }));
          return;
        }

        // Assignment requests：支持两种事件
        // 1) key 为 "copany:<copanyId>" → 批量更新该 copany 下所有 issue 的 in-progress 请求者
        // 2) key 为 issueId → 仅更新该 issue 的 in-progress 请求者
        if (detail.manager === "AssignmentRequestsManager") {
          const keyStr = String(detail.key);
          const dataList = (detail.data as AssignmentRequest[]) || [];
          // 情况 1：copany 级事件
          if (keyStr.startsWith("copany:")) {
            const [, keyCopanyId] = keyStr.split(":");
            if (String(keyCopanyId) === String(copanyId)) {
              const byIssue: Record<string, AssignmentRequest[]> = {};
              for (const it of dataList) {
                const k = String(it.issue_id);
                if (!byIssue[k]) byIssue[k] = [];
                byIssue[k].push(it);
              }
              const nextPending: Record<string, string[]> = {};
              const requesterIds = new Set<string>();
              for (const [iid, items] of Object.entries(byIssue)) {
                const inProg = computePendingRequestersForIssue(items);
                nextPending[iid] = inProg;
                for (const rid of inProg) requesterIds.add(rid);
              }
              setPendingRequestersByIssue((prev) => ({
                ...prev,
                ...nextPending,
              }));
              if (requesterIds.size > 0) {
                userInfoManager
                  .getMultipleUserInfo(Array.from(requesterIds))
                  .then((infos) => {
                    setRequestersInfo((prev) => ({ ...prev, ...infos }));
                  })
                  .catch(() => {});
              }
            }
            return;
          }

          // 情况 2：issue 级事件（保持原逻辑）
          const issueId = keyStr;
          const inProgress = computePendingRequestersForIssue(dataList);
          setPendingRequestersByIssue((prev) => ({
            ...prev,
            [issueId]: inProgress,
          }));
          if (inProgress.length > 0) {
            userInfoManager
              .getMultipleUserInfo(inProgress)
              .then((infos) => {
                setRequestersInfo((prev) => ({ ...prev, ...infos }));
              })
              .catch(() => {});
          }
          return;
        }

        // 用户信息：若为当前显示的请求者之一，则合并更新
        if (detail.manager === "UserInfoManager") {
          const userId = String(detail.key);
          const info = detail.data as UserInfo;
          setRequestersInfo((prev) => ({ ...prev, [userId]: info }));
          return;
        }
      } catch (_) {}
    };

    if (typeof window !== "undefined") {
      window.addEventListener("cache:updated", onCacheUpdated as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "cache:updated",
          onCacheUpdated as EventListener
        );
      }
    };
  }, [copanyId]);

  // 本地变更改为直接写入 React Query 缓存

  const renderAssignmentRequestBadge = (issueId: string) => {
    const reqIds = pendingRequestersByIssue[String(issueId)] || [];
    if (!reqIds || reqIds.length === 0) return null;
    const max = 2;
    const shown = reqIds.slice(0, max);
    const rest = reqIds.length - shown.length;
    return (
      <div className="flex flex-row items-center gap-0 -ml-1">
        <HandRaisedIcon className="w-[18px] h-[18px] -rotate-30 translate-y-0.5 translate-x-1" />
        <div className="flex -space-x-2">
          {shown.map((id) => {
            const info = requestersInfo[id];
            const name = info?.name || id;
            const avatar = info?.avatar_url || "";
            return avatar ? (
              <Image
                key={id}
                src={avatar}
                alt={name}
                width={22}
                height={22}
                className="w-[22px] h-[22px] rounded-full border border-white dark:border-black"
              />
            ) : (
              <div
                key={id}
                className="w-[22px] h-[22px] rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-black flex items-center justify-center text-[9px] text-gray-600 dark:text-gray-300"
                title={name}
              >
                {name.slice(0, 1).toUpperCase()}
              </div>
            );
          })}
          {rest > 0 ? (
            <div className="w-[22px] h-[22px] rounded-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-medium">
              +{rest}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  // Handle issue creation callback
  const handleIssueCreated = useCallback(
    (newIssue: IssueWithAssignee) => {
      queryClient.setQueryData<IssueWithAssignee[]>(
        ["issues", copanyId],
        (prev) => {
          const base = prev || [];
          const exists = base.some(
            (it) => String(it.id) === String(newIssue.id)
          );
          return exists
            ? base.map((it) =>
                String(it.id) === String(newIssue.id) ? newIssue : it
              )
            : [...base, newIssue];
        }
      );
    },
    [copanyId, queryClient]
  );

  // Handle issue state update callback
  const handleIssueStateUpdated = useCallback(
    (issueId: string, newState: number) => {
      queryClient.setQueryData<IssueWithAssignee[]>(
        ["issues", copanyId],
        (prev) => {
          const base = prev || [];
          return base.map((issue) =>
            String(issue.id) === String(issueId)
              ? { ...issue, state: newState }
              : issue
          );
        }
      );
    },
    [copanyId, queryClient]
  );

  // Handle issue priority update callback
  const handleIssuePriorityUpdated = useCallback(
    (issueId: string, newPriority: number) => {
      queryClient.setQueryData<IssueWithAssignee[]>(
        ["issues", copanyId],
        (prev) => {
          const base = prev || [];
          return base.map((issue) =>
            String(issue.id) === String(issueId)
              ? { ...issue, priority: newPriority }
              : issue
          );
        }
      );
    },
    [copanyId, queryClient]
  );

  // Handle issue level update callback
  const handleIssueLevelUpdated = useCallback(
    (issueId: string, newLevel: number) => {
      queryClient.setQueryData<IssueWithAssignee[]>(
        ["issues", copanyId],
        (prev) => {
          const base = prev || [];
          return base.map((issue) =>
            String(issue.id) === String(issueId)
              ? { ...issue, level: newLevel }
              : issue
          );
        }
      );
    },
    [copanyId, queryClient]
  );

  // Handle issue assignee update callback
  const handleIssueAssigneeUpdated = useCallback(
    (
      issueId: string,
      newAssignee: string | null,
      assigneeUser: AssigneeUser | null
    ) => {
      queryClient.setQueryData<IssueWithAssignee[]>(
        ["issues", copanyId],
        (prev) => {
          const base = prev || [];
          return base.map((issue) =>
            String(issue.id) === String(issueId)
              ? { ...issue, assignee: newAssignee, assignee_user: assigneeUser }
              : issue
          );
        }
      );
    },
    [copanyId, queryClient]
  );

  // Handle issue deletion
  const handleDeleteIssue = useCallback(
    async (issueId: string) => {
      try {
        // Remove from frontend first
        queryClient.setQueryData<IssueWithAssignee[]>(
          ["issues", copanyId],
          (prev) => {
            const base = prev || [];
            return base.filter((issue) => String(issue.id) !== String(issueId));
          }
        );
        setContextMenu({ show: false, x: 0, y: 0, issueId: "" }); // Close menu

        // Then call delete interface
        await deleteIssueAction(issueId);
      } catch (error) {
        console.error("Error deleting issue:", error);
        // If deletion fails, refetch list
        try {
          await queryClient.invalidateQueries({
            queryKey: ["issues", copanyId],
          });
        } catch (_) {}
      }
    },
    [copanyId, queryClient]
  );

  // Handle right-click menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, issueId: string) => {
      e.preventDefault();
      setContextMenu({
        show: true,
        x: e.clientX,
        y: e.clientY,
        issueId,
      });
    },
    []
  );

  // Close right-click menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ show: false, x: 0, y: 0, issueId: "" });
  }, []);

  // Create menu items
  const contextMenuItems: ContextMenuItem[] = [
    {
      label: "Delete Issue",
      onClick: () => handleDeleteIssue(contextMenu.issueId),
      className: "text-gray-900 dark:text-gray-100",
    },
  ];

  if (isIssuesLoading) {
    return <LoadingView type="label" />;
  }

  if (issues.length === 0) {
    return (
      <div>
        <EmptyPlaceholderView
          icon={
            <InboxStackIcon
              className="w-16 h-16 text-gray-500 dark:text-gray-400"
              strokeWidth={1}
            />
          }
          title="Add first issue"
          description="Issues are the smallest task units in Copany and form the foundation of contributions. By completing an Issue, members earn corresponding contribution points. Each Issue has its own priority, status, and contribution level."
          buttonIcon={<PlusIcon className="w-4 h-4" />}
          buttonTitle="New Issue"
          buttonAction={() => setIsModalOpen(true)}
          buttonDisabled={!currentUser}
          buttonTooltip="Sign in to create an issue"
        />
        {createIssueModal()}
      </div>
    );
  }

  const newIssueButton = (disabled: boolean) => {
    return (
      <Button
        onClick={() => setIsModalOpen(true)}
        className="min-w-24"
        size="md"
        disabled={disabled}
      >
        New Issue
      </Button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col gap-3">
      <div className="flex items-center justify-between md:pl-4 px-0 gap-3">
        {!currentUser ? (
          <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div className="inline-block">{newIssueButton(true)}</div>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="bottom"
                  sideOffset={8}
                  align="start"
                  className="tooltip-surface"
                >
                  Sign in to create an issue
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        ) : (
          newIssueButton(false)
        )}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            const value = e.target.value;
            setSearchQuery(value);
            const params = new URLSearchParams(searchParams.toString());
            if (value.trim()) {
              params.set("q", value);
            } else {
              params.delete("q");
            }
            const qs = params.toString();
            // Keep on the same path and update only query string
            router.replace(qs ? `?${qs}` : "?");
          }}
          placeholder="Search issues"
          className="border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 w-56 max-w-full shrink min-w-24 bg-transparent dark:text-gray-100 text-base"
        />
      </div>
      <div className="relative">
        {groupIssuesByState(filteredIssues).map((group) => (
          <div key={group.state} className="">
            {/* Group title (click to toggle collapse) */}
            <div
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 cursor-pointer select-none"
              onClick={() => toggleGroupCollapse(group.state)}
            >
              <div className="flex flex-row items-center gap-2">
                {group.label}
                <span className="text-base text-gray-600 dark:text-gray-400">
                  {group.issues.length}
                </span>
              </div>
            </div>

            {/* Issues in this state (hidden when collapsed) */}
            {!collapsedGroups[group.state] &&
              group.issues.map((issue) => {
                const readOnly = !(canEditByIssue[String(issue.id)] ?? false);
                return (
                  <div
                    className="flex flex-row items-center gap-2 py-2 px-4 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer select-none"
                    key={issue.id}
                    onClick={() => {
                      // Keep current URL parameters
                      const params = new URLSearchParams(
                        searchParams.toString()
                      );
                      router.push(
                        `/copany/${copanyId}/issue/${
                          issue.id
                        }?${params.toString()}`
                      );
                    }}
                    onContextMenu={(e) => handleContextMenu(e, issue.id)}
                  >
                    <IssueStateSelector
                      issueId={issue.id}
                      initialState={issue.state}
                      showText={false}
                      readOnly={readOnly}
                      onStateChange={handleIssueStateUpdated}
                      onServerUpdated={(serverIssue) => {
                        queryClient.setQueryData<IssueWithAssignee[]>(
                          ["issues", copanyId],
                          (prev) => {
                            const base = prev || [];
                            return base.map((it) =>
                              String(it.id) === String(serverIssue.id)
                                ? serverIssue
                                : it
                            );
                          }
                        );
                      }}
                    />
                    <IssuePrioritySelector
                      issueId={issue.id}
                      initialPriority={issue.priority}
                      showText={false}
                      onPriorityChange={handleIssuePriorityUpdated}
                      readOnly={readOnly}
                    />
                    <div className="text-base text-gray-900 dark:text-gray-100 text-left flex-1 w-full flex items-center gap-2">
                      <span>{issue.title || "No title"}</span>
                      {renderReviewBadge(issue)}
                    </div>
                    {renderAssignmentRequestBadge(String(issue.id))}
                    <IssueLevelSelector
                      issueId={issue.id}
                      initialLevel={issue.level}
                      showText={false}
                      onLevelChange={handleIssueLevelUpdated}
                      readOnly={readOnly}
                    />
                    <IssueAssigneeSelector
                      issueId={issue.id}
                      initialAssignee={issue.assignee}
                      assigneeUser={issue.assignee_user}
                      currentUser={currentUser}
                      contributors={contributors}
                      showText={false}
                      onAssigneeChange={handleIssueAssigneeUpdated}
                      readOnly={readOnly}
                      disableServerUpdate={true}
                      hasPendingByMe={(() => {
                        const meId = currentUser?.id
                          ? String(currentUser.id)
                          : null;
                        if (!meId) return false;
                        const reqIds =
                          pendingRequestersByIssue[String(issue.id)] || [];
                        return reqIds.includes(meId);
                      })()}
                      onRequestAssignment={() => {
                        try {
                          const params = new URLSearchParams(
                            searchParams.toString()
                          );
                          router.push(
                            `/copany/${copanyId}/issue/${
                              issue.id
                            }?${params.toString()}`
                          );
                        } catch (_) {}
                      }}
                    />
                  </div>
                );
              })}
          </div>
        ))}

        {/* Right-click menu */}
        <ContextMenu
          show={contextMenu.show}
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={handleCloseContextMenu}
        />
      </div>
      {/* Create Issue modal */}
      {createIssueModal()}
    </div>
  );

  function createIssueModal() {
    return (
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <IssueCreateForm
          copanyId={copanyId}
          onIssueCreated={handleIssueCreated}
          onClose={() => setIsModalOpen(false)}
          currentUser={currentUser}
          contributors={contributors}
        />
      </Modal>
    );
  }
}
