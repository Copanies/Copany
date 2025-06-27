"use client";

import { useState, useRef, useEffect } from "react";
import { IssueState } from "@/types/database.types";
import { updateIssueStateAction } from "@/actions/issue.actions";

interface IssueStateSelectorProps {
  issueId: string;
  initialState: number | null;
  showText: boolean;
}

export default function IssueStateSelector({
  issueId,
  initialState,
  showText,
}: IssueStateSelectorProps) {
  const [currentState, setCurrentState] = useState(initialState);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleStateChange = async (newState: IssueState) => {
    try {
      setCurrentState(newState);
      setIsOpen(false);

      // 调用更新状态接口
      await updateIssueStateAction(issueId, newState);

      console.log("State updated successfully:", newState);
    } catch (error) {
      console.error("Error updating state:", error);
      // 出错时回滚状态
      setCurrentState(initialState);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${"hover:opacity-80 cursor-pointer"}`}
      >
        {renderStateLabel(currentState, showText)}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 px-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
          <div className="py-1">
            {allStates.map((value) => (
              <button
                key={value}
                onClick={() => handleStateChange(value)}
                className={`flex flex-row items-center justify-between w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 rounded-md cursor-pointer ${
                  value === currentState
                    ? "bg-gray-100 dark:bg-gray-700 font-medium"
                    : ""
                }`}
              >
                {renderStateLabel(value, true)}
                {value === currentState && (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function renderStateLabel(state: number | null, showText: boolean) {
  switch (state) {
    case IssueState.Backlog:
      return <BacklogLabel showText={showText} />;
    case IssueState.Todo:
      return <TodoLabel showText={showText} />;
    case IssueState.InProgress:
      return <InProgressLabel showText={showText} />;
    case IssueState.Done:
      return <DoneLabel showText={showText} />;
    case IssueState.Canceled:
      return <CanceledLabel showText={showText} />;
    case IssueState.Duplicate:
      return <DuplicateLabel showText={showText} />;
    default:
      return <BacklogLabel showText={showText} />;
  }
}

function BacklogLabel({ showText }: { showText: boolean }) {
  return (
    <div className="text-gray-500 dark:text-gray-500 flex flex-row items-center gap-2">
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

function TodoLabel({ showText }: { showText: boolean }) {
  return (
    <div className="text-gray-500 dark:text-gray-500 flex flex-row items-center gap-2">
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

function InProgressLabel({ showText }: { showText: boolean }) {
  return (
    <div className="text-yellow-600 flex flex-row items-center gap-2">
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

function DoneLabel({ showText }: { showText: boolean }) {
  return (
    <div className="text-green-600 flex flex-row items-center gap-2">
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

function CanceledLabel({ showText }: { showText: boolean }) {
  return (
    <div className="text-gray-500 dark:text-gray-500 flex flex-row items-center gap-2">
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

function DuplicateLabel({ showText }: { showText: boolean }) {
  return (
    <div className="text-gray-500 dark:text-gray-500 flex flex-row items-center gap-2">
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
