"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/commons/Button";
import { formatRelativeTime } from "@/utils/time";
import { assignmentRequestsManager, userInfoManager } from "@/utils/cache";
import {
  issuesManager,
  issueActivityManager,
  issueReviewersManager,
} from "@/utils/cache";
import { listIssueActivityAction } from "@/actions/issueActivity.actions";
import { listIssueReviewersAction } from "@/actions/issueReviewer.actions";
import { getIssueAction } from "@/actions/issue.actions";
import {
  listAssignmentRequestsAction,
  acceptAssignmentRequestAction,
  refuseAssignmentRequestAction,
} from "@/actions/assignmentRequest.actions";
import type { AssignmentRequest } from "@/types/database.types";
import Image from "next/image";
import * as Tooltip from "@radix-ui/react-tooltip";
import { HandRaisedIcon } from "@heroicons/react/24/outline";

interface AssignmentRequestPanelProps {
  issueId: string;
  copanyId: string | null;
  requesterId: string; // 渲染该发起人的面板
  meId: string | null;
  canEdit: boolean; // determines button enable state (accept/refuse requires recipient permission)
  onFocusNewComment?: () => void;
  onActivityChanged?: () => void | Promise<void>;
}

export default function AssignmentRequestPanel({
  issueId,
  copanyId,
  requesterId,
  meId,
  canEdit,
  onFocusNewComment,
  onActivityChanged,
}: AssignmentRequestPanelProps) {
  const [items, setItems] = useState<AssignmentRequest[]>([]);
  const [userInfos, setUserInfos] = useState<
    Record<string, { name: string; email: string; avatar_url: string }>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestsForRequester = useMemo(() => {
    // Only keep records for this requester
    const list = items
      .filter((x) => String(x.requester_id) === String(requesterId))
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    if (list.length === 0) return [] as AssignmentRequest[];

    // Find the most recent refused (or accepted) time as a separator to identify the current batch
    const lastTerminalAt = list
      .filter((r) => r.status === "refused" || r.status === "accepted")
      .reduce<string | null>((acc, r) => {
        const t = r.updated_at || r.created_at;
        if (!acc) return t;
        return new Date(t).getTime() > new Date(acc).getTime() ? t : acc;
      }, null);

    // Current batch: all records created after lastTerminalAt
    const currentBatch = list.filter((r) =>
      lastTerminalAt
        ? new Date(r.created_at).getTime() > new Date(lastTerminalAt).getTime()
        : true
    );

    // If any non-requested status (accepted/refused/skipped) exists in the current batch, the request has ended, do not render
    if (currentBatch.some((r) => r.status !== "requested")) {
      return [] as AssignmentRequest[];
    }

    // Only keep records still in requested status in the current batch
    const activeRequested = currentBatch.filter(
      (r) => r.status === "requested"
    );
    return activeRequested;
  }, [items, requesterId]);

  const load = useCallback(async () => {
    // 非法 issueId（如 "temp"）直接跳过
    if (!/^\d+$/.test(String(issueId))) {
      setItems([]);
      return;
    }
    const list = await assignmentRequestsManager.getRequests(issueId, () =>
      listAssignmentRequestsAction(issueId)
    );
    setItems(list);
    const idSet = new Set<string>();
    for (const it of list) {
      idSet.add(String(it.requester_id));
      idSet.add(String(it.recipient_id));
    }
    const ids = Array.from(idSet);
    if (ids.length > 0) {
      const users = await userInfoManager.getMultipleUserInfo(ids);
      const map: Record<
        string,
        { name: string; email: string; avatar_url: string }
      > = {};
      for (const id of Object.keys(users)) {
        map[id] = {
          name: users[id].name || users[id].email || id,
          email: users[id].email,
          avatar_url: users[id].avatar_url || "",
        };
      }
      setUserInfos(map);
    }
  }, [issueId]);

  useEffect(() => {
    load();
  }, [load]);

  // Subscribe to cache updates for assignment requests and user infos
  useEffect(() => {
    // 非法 issueId（如 "temp"）时不订阅
    if (!/^\d+$/.test(String(issueId))) return;
    const onCacheUpdated = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as {
          manager: string;
          key: string;
          data: unknown;
        };
        if (!detail) return;

        // Assignment requests for current issue
        if (
          detail.manager === "AssignmentRequestsManager" &&
          String(detail.key) === String(issueId)
        ) {
          const list = (detail.data as AssignmentRequest[]) || [];
          setItems(list);
          // sync user infos used in panel
          const idSet = new Set<string>();
          for (const it of list) {
            idSet.add(String(it.requester_id));
            idSet.add(String(it.recipient_id));
          }
          const ids = Array.from(idSet);
          if (ids.length > 0) {
            userInfoManager
              .getMultipleUserInfo(ids)
              .then((users) => {
                const map: Record<
                  string,
                  { name: string; email: string; avatar_url: string }
                > = {};
                for (const id of Object.keys(users)) {
                  map[id] = {
                    name: users[id].name || users[id].email || id,
                    email: users[id].email,
                    avatar_url: users[id].avatar_url || "",
                  };
                }
                setUserInfos((prev) => ({ ...prev, ...map }));
              })
              .catch(() => {});
          }
          return;
        }

        // user info update for participants in current items
        if (detail.manager === "UserInfoManager") {
          const userId = String(detail.key);
          const info = detail.data as {
            name?: string;
            email?: string;
            avatar_url?: string;
          };
          const exists = items.some(
            (x) =>
              String(x.requester_id) === userId ||
              String(x.recipient_id) === userId
          );
          if (exists) {
            setUserInfos((prev) => ({
              ...prev,
              [userId]: {
                name: info?.name || info?.email || userId,
                email: info?.email || "",
                avatar_url: info?.avatar_url || "",
              },
            }));
          }
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
  }, [issueId, items]);

  if (requestsForRequester.length === 0) return null;

  return (
    <div className="border rounded-lg flex flex-col gap-3 border-blue-600 dark:border-blue-500">
      {(() => {
        const requester = userInfos[requesterId];
        const requesterName = requester?.name || requesterId;
        const reqs = requestsForRequester;
        return (
          <div
            key={requesterId}
            id={`assignment-request-${requesterId}`}
            className="flex flex-col"
          >
            <div
              className={`p-3 flex flex-col gap-2 border-b border-gray-200 dark:border-gray-800 rounded-t-lg bg-blue-600/8`}
            >
              <div className="flex items-center gap-2">
                <div className="flex flex-row items-center gap-0 -ml-2">
                  <HandRaisedIcon className="w-5 h-5 -rotate-30 translate-y-0.5 translate-x-1" />
                  {requester?.avatar_url ? (
                    <Image
                      src={requester.avatar_url}
                      alt={requesterName}
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-300">
                      {requesterName?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {requesterName} wants to be assigned
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {reqs.map((r) => {
                  const recipient = userInfos[String(r.recipient_id)];
                  const name = recipient?.name || String(r.recipient_id);
                  const avatar = recipient?.avatar_url || "";
                  return (
                    <div
                      key={r.id}
                      className="flex flex-row items-center gap-2"
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-yellow-600" />
                      </div>
                      {avatar ? (
                        <Image
                          src={avatar}
                          alt={name}
                          width={16}
                          height={16}
                          className="w-4 h-4 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-300">
                          {name?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                      <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {name}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 overflow-hidden">
                        {r.status}
                      </span>
                      <span className="whitespace-nowrap text-sm text-gray-500">
                        · {formatRelativeTime(r.updated_at || r.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            {reqs[0]?.message ? (
              <div className="px-3 pt-3 text-sm text-gray-800 dark:text-gray-200">
                {reqs[0].message}
              </div>
            ) : null}
            <div className="flex flex-row gap-2 px-3 pb-3 pt-2">
              {meId ? (
                <>
                  <Button
                    size="sm"
                    disabled={
                      isSubmitting ||
                      !canEdit ||
                      !reqs.some(
                        (x) =>
                          String(x.recipient_id) === String(meId) &&
                          x.status === "requested"
                      )
                    }
                    onClick={async () => {
                      const target = reqs.find(
                        (x) => String(x.recipient_id) === String(meId)
                      );
                      if (!target) return;
                      try {
                        setIsSubmitting(true);
                        const updated = await acceptAssignmentRequestAction(
                          issueId,
                          String(target.requester_id)
                        );
                        assignmentRequestsManager.updateRequest(
                          issueId,
                          updated
                        );
                        const fresh = await listAssignmentRequestsAction(
                          issueId
                        );
                        assignmentRequestsManager.setRequests(issueId, fresh);
                        setItems(fresh);
                        // 由于接受请求会导致 Issue.assignee 变化、产生活动、可能影响评审者，触发对应缓存的联动刷新
                        try {
                          // 刷新 issue 列表缓存（更新 assignee）
                          if (copanyId) {
                            const latest = await getIssueAction(issueId);
                            if (latest) {
                              issuesManager.updateIssue(copanyId, latest);
                            }
                          }
                          await Promise.all([
                            issueActivityManager.revalidate(issueId, () =>
                              listIssueActivityAction(issueId, 200)
                            ),
                            issueReviewersManager.revalidate(issueId, () =>
                              listIssueReviewersAction(issueId)
                            ),
                          ]);
                        } catch (_) {}
                        if (onActivityChanged) await onActivityChanged();
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    variant="approve"
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    disabled={
                      isSubmitting ||
                      !canEdit ||
                      !reqs.some(
                        (x) =>
                          String(x.recipient_id) === String(meId) &&
                          x.status === "requested"
                      )
                    }
                    onClick={async () => {
                      const target = reqs.find(
                        (x) => String(x.recipient_id) === String(meId)
                      );
                      if (!target) return;
                      try {
                        setIsSubmitting(true);
                        const updated = await refuseAssignmentRequestAction(
                          issueId,
                          String(target.requester_id)
                        );
                        assignmentRequestsManager.updateRequest(
                          issueId,
                          updated
                        );
                        const fresh = await listAssignmentRequestsAction(
                          issueId
                        );
                        assignmentRequestsManager.setRequests(issueId, fresh);
                        setItems(fresh);
                        // 拒绝请求通常也会产生活动，刷新活动与评审者
                        try {
                          await Promise.all([
                            issueActivityManager.revalidate(issueId, () =>
                              listIssueActivityAction(issueId, 200)
                            ),
                            issueReviewersManager.revalidate(issueId, () =>
                              listIssueReviewersAction(issueId)
                            ),
                          ]);
                        } catch (_) {}
                        if (onActivityChanged) await onActivityChanged();
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                  >
                    Refuse
                  </Button>
                </>
              ) : (
                <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <div className="inline-block">
                        <Button disabled size="sm">
                          Accept
                        </Button>
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        side="top"
                        sideOffset={8}
                        align="center"
                        className="tooltip-surface"
                      >
                        Sign in to act on requests
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              )}
              {meId ? (
                <Button
                  size="sm"
                  onClick={() => {
                    try {
                      const el = document.getElementById(
                        "new-comment-composer"
                      );
                      if (el) {
                        el.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }
                      if (onFocusNewComment) {
                        setTimeout(() => onFocusNewComment(), 220);
                      }
                    } catch (_) {}
                  }}
                >
                  Comment
                </Button>
              ) : (
                <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <div className="inline-block">
                        <Button disabled size="sm">
                          Comment
                        </Button>
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        side="top"
                        sideOffset={8}
                        align="center"
                        className="tooltip-surface"
                      >
                        Sign in to join the discussion
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
