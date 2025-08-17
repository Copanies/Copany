"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Button from "@/components/commons/Button";
import { formatRelativeTime } from "@/utils/time";
import { userInfoManager, issueReviewersManager } from "@/utils/cache";
import {
  listIssueReviewersAction,
  approveMyReviewAction,
} from "@/actions/issueReviewer.actions";
import { updateIssueStateAction } from "@/actions/issue.actions";
import { IssueState, type IssueReviewer } from "@/types/database.types";
import InreviewIcon from "@/assets/in_review_state.svg";
import { CheckIcon, ArrowRightIcon } from "@heroicons/react/24/solid";
import { renderLevelLabel } from "./IssueLevelSelector";
import * as Tooltip from "@radix-ui/react-tooltip";

interface IssueReviewPanelProps {
  issueId: string;
  issueState: number | null;
  issueLevel: number | null;
  meId: string | null;
  canEdit: boolean;
  onFocusNewComment?: () => void;
  onActivityChanged?: () => void | Promise<void>;
}

export default function IssueReviewPanel({
  issueId,
  issueState,
  issueLevel,
  meId,
  canEdit,
  onFocusNewComment,
  onActivityChanged,
}: IssueReviewPanelProps) {
  const [reviewers, setReviewers] = useState<IssueReviewer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [userInfos, setUserInfos] = useState<
    Record<string, { name: string; email: string; avatar_url: string }>
  >({});

  const hasAnyApproved = useMemo(
    () => reviewers.some((r) => r.status === "approved"),
    [reviewers]
  );

  const canApprove = useMemo(() => {
    if (!meId) return false;
    return reviewers.some(
      (r) => String(r.reviewer_id) === String(meId) && r.status === "requested"
    );
  }, [reviewers, meId]);

  const isReviewerMe = useMemo(() => {
    if (!meId) return false;
    return reviewers.some((r) => String(r.reviewer_id) === String(meId));
  }, [reviewers, meId]);

  const load = useCallback(async () => {
    // reviewers
    const rs = await issueReviewersManager.getReviewers(issueId, () =>
      listIssueReviewersAction(issueId)
    );
    setReviewers(rs);

    // user infos
    const ids = Array.from(new Set(rs.map((r) => String(r.reviewer_id))));
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
    } else {
      setUserInfos({});
    }
  }, [issueId]);

  useEffect(() => {
    load();
  }, [load]);

  // Only render in In Review state (after hooks)
  if (issueState !== IssueState.InReview) return null;

  return (
    <div
      className={`-ml-3 mb-2 border rounded-lg border-[#7B00FF] flex flex-col gap-3 ${
        hasAnyApproved ? "border-[#058E00]" : "border-[#7B00FF]"
      }`}
    >
      <div
        className={`p-3 flex flex-col gap-2 border-b border-gray-200 dark:border-gray-800 rounded-t-lg ${
          hasAnyApproved ? "bg-[#058E00]/8" : "bg-[#7B00FF]/8"
        }`}
      >
        <div className="flex flex-row items-center justify-between">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex flex-row items-center gap-2">
            {/* Title prefix: In Review label or Approved check */}
            {hasAnyApproved ? (
              <CheckIcon className="w-6 h-6 text-white bg-[#058E00] rounded-full p-1" />
            ) : (
              // In Review label icon-only
              <Image
                src={InreviewIcon}
                alt="In Review"
                width={20}
                height={20}
              />
            )}
            {hasAnyApproved
              ? "Issue approved"
              : isReviewerMe
              ? "Issue need your review"
              : "Issue waiting for review"}
          </div>
        </div>

        {/* reviewers list */}
        <div className="flex flex-col gap-2">
          {reviewers.map((r) => {
            const info = userInfos[String(r.reviewer_id)];
            const name = info?.name || String(r.reviewer_id);
            const avatar = info?.avatar_url || "";
            const isApproved = r.status === "approved";
            const when = isApproved ? r.updated_at : r.created_at;
            return (
              <div
                key={`${r.issue_id}-${r.reviewer_id}`}
                className="flex flex-row items-center gap-2"
              >
                <div className="flex flex-row items-center gap-2">
                  <div
                    className={`rounded-full flex items-center justify-center ${
                      isApproved ? "w-6 h-6" : "w-5 h-5"
                    }`}
                  >
                    {isApproved ? (
                      <CheckIcon className="w-4 h-4 text-[#058E00]" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    )}
                  </div>
                  <div className="flex flex-row items-center gap-1">
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
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {isApproved ? "approved" : "requested"}
                  <span className="pl-2 whitespace-nowrap">
                    · {formatRelativeTime(when)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-3 px-3 pb-3">
        <div className="flex flex-row items-center gap-2">
          <span className="text-sm">Issue level: </span>
          {renderLevelLabel(issueLevel, false)}
        </div>
        <div className="flex flex-row gap-2">
          {hasAnyApproved ? (
            !canEdit ? (
              <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <div className="inline-block">
                      <Button disabled size="sm" variant="approve">
                        <div className="flex flex-row items-center gap-1">
                          <ArrowRightIcon className="w-4 h-4 text-white" />
                          <span>Mark as Done</span>
                        </div>
                      </Button>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="top"
                      sideOffset={8}
                      align="center"
                      className="z-[9999] rounded bg-white text-gray-900 text-sm px-3 py-2 shadow-lg border border-gray-200 whitespace-pre-line break-words"
                    >
                      No permission to edit
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            ) : (
              <Button
                onClick={async () => {
                  try {
                    setIsSubmitting(true);
                    await updateIssueStateAction(issueId, IssueState.Done);
                    if (onActivityChanged) await onActivityChanged();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting || !meId}
                size="sm"
                variant="approve"
              >
                <div className="flex flex-row items-center gap-1">
                  <ArrowRightIcon className="w-4 h-4 text-white" />
                  <span>Mark as Done</span>
                </div>
              </Button>
            )
          ) : (
            <Button
              onClick={async () => {
                try {
                  setIsSubmitting(true);
                  const updated = await approveMyReviewAction(issueId);
                  // 更新缓存中的 Reviewer 状态
                  issueReviewersManager.updateReviewer(issueId, updated);
                  // 从缓存读取最新 reviewers
                  const rs = await issueReviewersManager.getReviewers(
                    issueId,
                    () => listIssueReviewersAction(issueId)
                  );
                  setReviewers(rs);
                  if (onActivityChanged) await onActivityChanged();
                } catch (e) {
                  console.error(e);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting || !meId || !canApprove}
              size="sm"
              variant="approve"
            >
              <div className="flex flex-row items-center gap-1">
                <CheckIcon className="w-4 h-4 text-white" />
                <span>Approve</span>
              </div>
            </Button>
          )}
          {!hasAnyApproved && meId ? (
            <Button
              size="sm"
              onClick={() => {
                try {
                  const el = document.getElementById("new-comment-composer");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                  // trigger focus after scroll
                  if (onFocusNewComment) {
                    setTimeout(() => onFocusNewComment(), 220);
                  }
                } catch (_e) {
                  // ignore
                }
              }}
            >
              Leave a comment
            </Button>
          ) : (
            <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div className="inline-block">
                    <Button disabled size="sm">
                      Leave a comment
                    </Button>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="top"
                    sideOffset={8}
                    align="center"
                    className="z-[9999] rounded bg-white text-gray-900 text-sm px-3 py-2 shadow-lg border border-gray-200 whitespace-pre-line break-words"
                  >
                    Sign in to join the discussion
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          )}
        </div>
      </div>
    </div>
  );
}
