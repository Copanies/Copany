"use client";

import { useEffect, useMemo, useState } from "react";
import { IssueState, IssueWithAssignee } from "@/types/database.types";
import { updateIssueStateAction } from "@/actions/issue.actions";
import { useUpdateIssueState } from "@/hooks/issues";
import Dropdown from "@/components/commons/Dropdown";
import Image from "next/image";
import InreviewIcon from "@/assets/in_review_state.svg";
import InreviewDarkIcon from "@/assets/in_review_state_dark.svg";
import { listIssueReviewersAction } from "@/actions/issueReviewer.actions";
import { issueReviewersManager } from "@/utils/cache";
import { listIssueActivityAction } from "@/actions/issueActivity.actions";
import { issueActivityManager } from "@/utils/cache";
import { useDarkMode } from "@/utils/useDarkMode";

interface IssueStateSelectorProps {
  issueId: string;
  initialState: number | null;
  showText: boolean;
  showBackground?: boolean;
  onStateChange?: (issueId: string, newState: number) => void;
  disableServerUpdate?: boolean;
  readOnly?: boolean;
  onServerUpdated?: (updatedIssue: IssueWithAssignee) => void;
  copanyId?: string;
}

export default function IssueStateSelector({
  issueId,
  initialState,
  showText,
  showBackground = false,
  onStateChange,
  disableServerUpdate = false,
  readOnly = false,
  onServerUpdated,
  copanyId,
}: IssueStateSelectorProps) {
  const [currentState, setCurrentState] = useState(initialState);
  const [hasApprovedReview, setHasApprovedReview] = useState<boolean>(false);
  const [isLoadingReviewers, setIsLoadingReviewers] = useState<boolean>(false);
  const mutation = useUpdateIssueState(copanyId || "");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (currentState !== IssueState.InReview) {
        if (mounted) setHasApprovedReview(false);
        return;
      }
      try {
        setIsLoadingReviewers(true);
        const reviewers = await issueReviewersManager.getReviewers(
          issueId,
          () => listIssueReviewersAction(issueId)
        );
        if (!mounted) return;
        setHasApprovedReview(reviewers.some((r) => r.status === "approved"));
      } catch (_) {
        if (mounted) setHasApprovedReview(false);
      } finally {
        if (mounted) setIsLoadingReviewers(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [issueId, currentState]);

  // Subscribe to cache updates for reviewers to reflect background refresh
  useEffect(() => {
    const onCacheUpdated = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as {
          manager: string;
          key: string;
          data: unknown;
        };
        if (!detail) return;
        if (
          detail.manager === "IssueReviewersManager" &&
          String(detail.key) === String(issueId)
        ) {
          try {
            const reviewers = (detail.data as { status?: string }[]) || [];
            setHasApprovedReview(
              reviewers.some((r) => r.status === "approved")
            );
          } catch (_) {}
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
  }, [issueId]);

  const handleStateChange = async (newState: number) => {
    if (readOnly) return;
    try {
      setCurrentState(newState);

      // Immediately call callback to update frontend state, provide instant feedback
      if (onStateChange) {
        onStateChange(issueId, newState);
      }

      // Only call the update state API when not in creation mode
      if (!disableServerUpdate) {
        let updatedIssue: IssueWithAssignee;
        if (copanyId) {
          updatedIssue = await mutation.mutateAsync({
            issueId,
            state: newState,
          });
        } else {
          updatedIssue = await updateIssueStateAction(issueId, newState);
        }
        // Notify server-updated result so parent can overwrite cache/state with authoritative data
        if (onServerUpdated) {
          onServerUpdated(updatedIssue);
        }
        console.log("State updated successfully:", newState);

        // 由于状态变化会产生新的活动，触发活动流刷新
        try {
          await issueActivityManager.revalidate(issueId, () =>
            listIssueActivityAction(issueId, 200)
          );
        } catch (_) {}

        // 若进入 In Progress 或 In Review 等节点，重新拉取 reviewers（服务端可能创建/调整评审任务）
        try {
          await issueReviewersManager.revalidate(issueId, () =>
            listIssueReviewersAction(issueId)
          );
        } catch (_) {}
      }
    } catch (error) {
      console.error("Error updating state:", error);
      // Rollback state on error
      setCurrentState(initialState);
      // If there's a callback, also need to rollback frontend state
      if (onStateChange && initialState !== null) {
        onStateChange(issueId, initialState);
      }
    }
  };

  // Build state options with conditional disabling for Done
  const stateOptions = useMemo(() => {
    const allStates = [
      IssueState.Backlog,
      IssueState.Todo,
      IssueState.InProgress,
      IssueState.InReview,
      IssueState.Done,
      IssueState.Canceled,
      IssueState.Duplicate,
    ];
    const allowDone =
      currentState === IssueState.InReview && hasApprovedReview === true;
    const doneTooltip = (() => {
      if (allowDone) return undefined;
      if (currentState !== IssueState.InReview)
        return "Only allowed after review";
      if (!hasApprovedReview) return "Requires at least one approval";
      return undefined;
    })();
    const base = allStates.map((state) => ({
      value: state,
      label: renderStateLabel(state, true),
      disabled:
        state === IssueState.Done &&
        !allowDone &&
        !isLoadingReviewers &&
        !readOnly,
      tooltip: state === IssueState.Done ? doneTooltip : undefined,
    }));
    if (readOnly) {
      return base.map((opt) => ({
        ...opt,
        disabled: true,
        tooltip: "No permission to edit",
      }));
    }
    return base;
  }, [currentState, hasApprovedReview, isLoadingReviewers, readOnly]);

  return (
    <Dropdown
      trigger={renderStateLabel(currentState, showText)}
      options={stateOptions}
      selectedValue={currentState}
      onSelect={handleStateChange}
      showBackground={showBackground}
      disabled={false}
    />
  );
}

export function renderStateLabel(
  state: number | null,
  showText: boolean,
  colorful: boolean = true
) {
  switch (state) {
    case IssueState.Backlog:
      return <BacklogLabel showText={showText} colorful={colorful} />;
    case IssueState.Todo:
      return <TodoLabel showText={showText} colorful={colorful} />;
    case IssueState.InProgress:
      return <InProgressLabel showText={showText} colorful={colorful} />;
    case IssueState.InReview:
      return <InReviewLabel showText={showText} colorful={colorful} />;
    case IssueState.Done:
      return <DoneLabel showText={showText} colorful={colorful} />;
    case IssueState.Canceled:
      return <CanceledLabel showText={showText} colorful={colorful} />;
    case IssueState.Duplicate:
      return <DuplicateLabel showText={showText} colorful={colorful} />;
    default:
      return <BacklogLabel showText={showText} colorful={colorful} />;
  }
}

function BacklogLabel({
  showText,
  colorful,
}: {
  showText: boolean;
  colorful: boolean;
}) {
  return (
    <div
      className={`flex flex-row items-center gap-2 ${
        colorful
          ? "text-gray-500 dark:text-gray-500"
          : "text-gray-500 dark:text-gray-500"
      }`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <circle
          cx="12"
          cy="12"
          r="8"
          strokeDasharray="2 4"
          strokeLinecap="round"
          strokeWidth={2}
        />
      </svg>
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100">
          Backlog
        </span>
      )}
    </div>
  );
}

function TodoLabel({
  showText,
  colorful,
}: {
  showText: boolean;
  colorful: boolean;
}) {
  return (
    <div
      className={`flex flex-row items-center gap-2 ${
        colorful
          ? "text-gray-500 dark:text-gray-500"
          : "text-gray-500 dark:text-gray-500"
      }`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="8" strokeLinecap="round" strokeWidth={2} />
      </svg>
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100">Todo</span>
      )}
    </div>
  );
}

function InProgressLabel({
  showText,
  colorful,
}: {
  showText: boolean;
  colorful: boolean;
}) {
  return (
    <div
      className={`flex flex-row items-center gap-2 ${
        colorful ? "text-yellow-600" : "text-gray-500 dark:text-gray-500"
      }`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="8" strokeWidth={2} fill="none" />
        <path d="M12 8 A4 4 0 0 1 12 16 Z" fill="currentColor" />
      </svg>
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100">
          In Progress
        </span>
      )}
    </div>
  );
}

function InReviewLabel({
  showText,
  colorful,
}: {
  showText: boolean;
  colorful: boolean;
}) {
  const isDarkMode = useDarkMode();
  return (
    <div
      className={`flex flex-row items-center gap-2 ${
        colorful ? "text-indigo-600" : "text-gray-500 dark:text-gray-500"
      }`}
    >
      <Image
        src={isDarkMode ? InreviewDarkIcon : InreviewIcon}
        width={20}
        height={20}
        alt="In Review"
      />
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100">
          In Review
        </span>
      )}
    </div>
  );
}

function DoneLabel({
  showText,
  colorful,
}: {
  showText: boolean;
  colorful: boolean;
}) {
  return (
    <div
      className={`flex flex-row items-center gap-2 ${
        colorful ? "text-green-600" : "text-gray-500 dark:text-gray-500"
      }`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="8" strokeWidth={2} fill="currentColor" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 12l3 3.5 6-6"
          stroke="white"
        />
      </svg>
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100">Done</span>
      )}
    </div>
  );
}

function CanceledLabel({
  showText,
  colorful,
}: {
  showText: boolean;
  colorful: boolean;
}) {
  return (
    <div
      className={`flex flex-row items-center gap-2 ${
        colorful
          ? "text-gray-500 dark:text-gray-500"
          : "text-gray-500 dark:text-gray-500"
      }`}
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth={2} fill="currentColor" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 9L15 15M9 15L15 9"
          stroke="white"
        />
      </svg>
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100">
          Canceled
        </span>
      )}
    </div>
  );
}

function DuplicateLabel({
  showText,
  colorful,
}: {
  showText: boolean;
  colorful: boolean;
}) {
  return (
    <div
      className={`flex flex-row items-center gap-2 ${
        colorful
          ? "text-gray-500 dark:text-gray-500"
          : "text-gray-500 dark:text-gray-500"
      }`}
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth={2} fill="currentColor" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 9L15 15M9 15L15 9"
          stroke="white"
        />
      </svg>
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100">
          Duplicate
        </span>
      )}
    </div>
  );
}
