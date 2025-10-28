"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { IssueState, IssueWithAssignee } from "@/types/database.types";
import { updateIssueStateAction } from "@/actions/issue.actions";
import { useUpdateIssueState } from "@/hooks/issues";
import Dropdown from "@/components/commons/Dropdown";
import Image from "next/image";
import InreviewIcon from "@/assets/in_review_state.svg";
import InreviewDarkIcon from "@/assets/in_review_state_dark.svg";
import { listIssueReviewersAction } from "@/actions/issueReviewer.actions";
import { useQueryClient } from "@tanstack/react-query";
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
  const qc = useQueryClient();

  // 使用 useRef 稳定 mutation 方法，避免 effect 依赖整个对象
  const mutateRef = useRef(mutation.mutateAsync);
  useEffect(() => {
    mutateRef.current = mutation.mutateAsync;
  }, [mutation.mutateAsync]);

  // 当 props 变化时同步内部状态，确保外部缓存更新能反映到 UI
  useEffect(() => {
    setCurrentState(initialState);
  }, [initialState]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (currentState !== IssueState.InReview) {
        if (mounted) setHasApprovedReview(false);
        return;
      }
      try {
        setIsLoadingReviewers(true);
        const reviewers = await listIssueReviewersAction(issueId);
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

  const handleStateChange = async (newState: number) => {
    if (readOnly) return;
    try {
      setCurrentState(newState);

      if (onStateChange) {
        onStateChange(issueId, newState);
      }

      if (!disableServerUpdate) {
        let updatedIssue: IssueWithAssignee;
        if (copanyId) {
          updatedIssue = await mutateRef.current({
            issueId,
            state: newState,
          });
        } else {
          updatedIssue = await updateIssueStateAction(issueId, newState);
        }
        if (onServerUpdated) onServerUpdated(updatedIssue);

        try {
          await Promise.all([
            qc.invalidateQueries({ queryKey: ["issueActivity", issueId] }),
            qc.invalidateQueries({ queryKey: ["issueReviewers", issueId] }),
          ]);
        } catch (_) {}
      }
    } catch (error) {
      console.error("Error updating state:", error);
      setCurrentState(initialState);
      if (onStateChange && initialState !== null) {
        onStateChange(issueId, initialState);
      }
    }
  };

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
      marginX={showBackground ? 0 : 2}
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
        <span className="text-base text-gray-900 dark:text-gray-100 shrink-0">
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
        className="w-5 h-5 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="8" strokeLinecap="round" strokeWidth={2} />
      </svg>
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100 shrink-0">
          Todo
        </span>
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
        className="w-5 h-5 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="8" strokeWidth={2} fill="none" />
        <path d="M12 8 A4 4 0 0 1 12 16 Z" fill="currentColor" />
      </svg>
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100 shrink-0">
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
        className="w-5 h-5 shrink-0"
      />
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100 shrink-0">
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
        className="w-5 h-5 shrink-0"
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
        <span className="text-base text-gray-900 dark:text-gray-100 shrink-0">
          Done
        </span>
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
      <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
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
        <span className="text-base text-gray-900 dark:text-gray-100 shrink-0">
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
      <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
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
        <span className="text-base text-gray-900 dark:text-gray-100 shrink-0">
          Duplicate
        </span>
      )}
    </div>
  );
}
