"use client";

import { useState } from "react";
import { IssueState, IssueWithAssignee } from "@/types/database.types";
import { updateIssueStateAction } from "@/actions/issue.actions";
import Dropdown from "@/components/commons/Dropdown";
import Image from "next/image";
import InreviewIcon from "@/assets/in_review_state.svg";

interface IssueStateSelectorProps {
  issueId: string;
  initialState: number | null;
  showText: boolean;
  showBackground?: boolean;
  onStateChange?: (issueId: string, newState: number) => void;
  disableServerUpdate?: boolean;
  readOnly?: boolean;
  onServerUpdated?: (updatedIssue: IssueWithAssignee) => void;
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
}: IssueStateSelectorProps) {
  const [currentState, setCurrentState] = useState(initialState);

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
        const updatedIssue = await updateIssueStateAction(issueId, newState);
        // Notify server-updated result so parent can overwrite cache/state with authoritative data
        if (onServerUpdated) {
          onServerUpdated(updatedIssue);
        }
        console.log("State updated successfully:", newState);
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

  // Get all available states
  const allStates = [
    IssueState.Backlog,
    IssueState.Todo,
    IssueState.InProgress,
    IssueState.InReview,
    IssueState.Done,
    IssueState.Canceled,
    IssueState.Duplicate,
  ];

  const stateOptions = allStates.map((state) => ({
    value: state,
    label: renderStateLabel(state, true),
  }));

  return (
    <Dropdown
      trigger={renderStateLabel(currentState, showText)}
      options={stateOptions}
      selectedValue={currentState}
      onSelect={handleStateChange}
      showBackground={showBackground}
      disabled={readOnly}
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
  return (
    <div
      className={`flex flex-row items-center gap-2 ${
        colorful ? "text-indigo-600" : "text-gray-500 dark:text-gray-500"
      }`}
    >
      <Image src={InreviewIcon} width={20} height={20} alt="In Review" />
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
