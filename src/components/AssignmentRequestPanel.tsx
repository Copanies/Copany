"use client";

import { useMemo, useState } from "react";
import Button from "@/components/commons/Button";
import { formatRelativeTime } from "@/utils/time";
import type { AssignmentRequest } from "@/types/database.types";
import Image from "next/image";
import * as Tooltip from "@radix-ui/react-tooltip";
import { HandRaisedIcon } from "@heroicons/react/24/outline";
import {
  useAssignmentRequests,
  useAcceptAssignmentRequest,
  useRefuseAssignmentRequest,
} from "@/hooks/assignmentRequests";
import { useUsersInfo } from "@/hooks/userInfo";
import { useQueryClient } from "@tanstack/react-query";

interface AssignmentRequestPanelProps {
  issueId: string;
  copanyId: string | null;
  requesterId: string;
  meId: string | null;
  canEdit: boolean;
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
  const { data: itemsData } = useAssignmentRequests(issueId);
  const items = (itemsData || []) as AssignmentRequest[];
  const userIds = Array.from(
    new Set(
      items
        .flatMap((it) => [String(it.requester_id), String(it.recipient_id)])
        .filter(Boolean)
    )
  );
  const { data: userInfosMap } = useUsersInfo(userIds);
  const userInfos: Record<
    string,
    { name: string; email: string; avatar_url: string }
  > = Object.fromEntries(
    Object.entries(userInfosMap || {}).map(([id, v]) => [
      id,
      { name: v.name, email: v.email, avatar_url: v.avatar_url },
    ])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const qc = useQueryClient();
  const acceptMutation = useAcceptAssignmentRequest(
    issueId,
    copanyId || undefined
  );
  const refuseMutation = useRefuseAssignmentRequest(
    issueId,
    copanyId || undefined
  );

  const requestsForRequester = useMemo(() => {
    const list = items
      .filter((x) => String(x.requester_id) === String(requesterId))
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    if (list.length === 0) return [] as AssignmentRequest[];
    const lastTerminalAt = list
      .filter((r) => r.status === "refused" || r.status === "accepted")
      .reduce<string | null>((acc, r) => {
        const t = r.updated_at || r.created_at;
        if (!acc) return t;
        return new Date(t).getTime() > new Date(acc).getTime() ? t : acc;
      }, null);
    const currentBatch = list.filter((r) =>
      lastTerminalAt
        ? new Date(r.created_at).getTime() > new Date(lastTerminalAt).getTime()
        : true
    );
    if (currentBatch.some((r) => r.status !== "requested"))
      return [] as AssignmentRequest[];
    return currentBatch.filter((r) => r.status === "requested");
  }, [items, requesterId]);

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
                        await acceptMutation.mutateAsync(
                          String(target.requester_id)
                        );
                        await Promise.all([
                          qc.invalidateQueries({
                            queryKey: ["issueActivity", issueId],
                          }),
                          qc.invalidateQueries({
                            queryKey: ["issueReviewers", issueId],
                          }),
                          copanyId
                            ? qc.invalidateQueries({
                                queryKey: ["issues", copanyId],
                              })
                            : Promise.resolve(),
                        ]);
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
                        await refuseMutation.mutateAsync(
                          String(target.requester_id)
                        );
                        await Promise.all([
                          qc.invalidateQueries({
                            queryKey: ["issueActivity", issueId],
                          }),
                          qc.invalidateQueries({
                            queryKey: ["issueReviewers", issueId],
                          }),
                        ]);
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
