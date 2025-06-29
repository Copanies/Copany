"use client";

import { useState } from "react";
import { IssueState } from "@/types/database.types";
import { updateIssueStateAction } from "@/actions/issue.actions";
import Dropdown from "@/components/commons/Dropdown";

interface IssueStateSelectorProps {
  issueId: string;
  initialState: number | null;
  showText: boolean;
  showBackground?: boolean;
  onStateChange?: (issueId: string, newState: number) => void;
}

export default function IssueStateSelector({
  issueId,
  initialState,
  showText,
  showBackground = false,
  onStateChange,
}: IssueStateSelectorProps) {
  const [currentState, setCurrentState] = useState(initialState);

  const handleStateChange = async (newState: number) => {
    try {
      setCurrentState(newState);

      // 立即调用回调更新前端状态，提供即时反馈
      if (onStateChange) {
        onStateChange(issueId, newState);
      }

      // 然后调用更新状态接口
      await updateIssueStateAction(issueId, newState);

      console.log("State updated successfully:", newState);
    } catch (error) {
      console.error("Error updating state:", error);
      // 出错时回滚状态
      setCurrentState(initialState);
      // 如果有回调，也需要回滚前端状态
      if (onStateChange && initialState !== null) {
        onStateChange(issueId, initialState);
      }
    }
  };

  // 获取所有可用状态
  const allStates = [
    IssueState.Backlog,
    IssueState.Todo,
    IssueState.InProgress,
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
