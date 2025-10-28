"use client";

import { useState, useRef, useEffect } from "react";
import { IssuePriority } from "@/types/database.types";
import { updateIssuePriorityAction } from "@/actions/issue.actions";
import { useUpdateIssuePriority } from "@/hooks/issues";
import Dropdown from "@/components/commons/Dropdown";
import { useQueryClient } from "@tanstack/react-query";

interface IssuePrioritySelectorProps {
  issueId: string;
  initialPriority: number | null;
  showText: boolean;
  showBackground?: boolean;
  onPriorityChange?: (issueId: string, newPriority: number) => void;
  disableServerUpdate?: boolean;
  readOnly?: boolean;
  copanyId?: string; // for React Query mutation
}

export default function IssuePrioritySelector({
  issueId,
  initialPriority,
  showText,
  showBackground = false,
  onPriorityChange,
  disableServerUpdate = false,
  readOnly = false,
  copanyId,
}: IssuePrioritySelectorProps) {
  const [currentPriority, setCurrentPriority] = useState(initialPriority);
  const mutation = useUpdateIssuePriority(copanyId || "");
  const qc = useQueryClient();

  // 使用 useRef 稳定 mutation 方法，避免 effect 依赖整个对象
  const mutateRef = useRef(mutation.mutateAsync);
  useEffect(() => {
    mutateRef.current = mutation.mutateAsync;
  }, [mutation.mutateAsync]);

  const handlePriorityChange = async (newPriority: number) => {
    if (readOnly) return;
    try {
      setCurrentPriority(newPriority);

      // Immediately call callback to update frontend state, provide instant feedback
      if (onPriorityChange) {
        onPriorityChange(issueId, newPriority);
      }

      // Only call the update priority API when not in creation mode
      if (!disableServerUpdate) {
        if (copanyId) {
          await mutateRef.current({ issueId, priority: newPriority });
        } else {
          await updateIssuePriorityAction(issueId, newPriority);
        }
        console.log("Priority updated successfully:", newPriority);

        // 优先级变化会产生活动，触发活动流查询失效
        try {
          await qc.invalidateQueries({ queryKey: ["issueActivity", issueId] });
        } catch (_) {}
      }
    } catch (error) {
      console.error("Error updating priority:", error);
      // Rollback state on error
      setCurrentPriority(initialPriority);
      // If there's a callback, also need to rollback frontend state
      if (onPriorityChange && initialPriority !== null) {
        onPriorityChange(issueId, initialPriority);
      }
    }
  };

  // Get all available priorities
  const allPriorities = [
    IssuePriority.None,
    IssuePriority.Urgent,
    IssuePriority.High,
    IssuePriority.Medium,
    IssuePriority.Low,
  ];

  const priorityOptions = allPriorities.map((priority) => ({
    value: priority,
    label: renderPriorityLabel(priority, true),
    disabled: readOnly,
    tooltip: readOnly ? "No permission to edit" : undefined,
  }));

  return (
    <Dropdown
      trigger={renderPriorityLabel(currentPriority, showText)}
      options={priorityOptions}
      selectedValue={currentPriority}
      onSelect={handlePriorityChange}
      showBackground={showBackground}
      marginX={showBackground ? 0 : 2}
      disabled={false}
    />
  );
}

export function renderPriorityLabel(
  priority: number | null,
  showText: boolean
) {
  switch (priority) {
    case IssuePriority.None:
      return <NoneLabel showText={showText} />;
    case IssuePriority.Urgent:
      return <UrgentLabel showText={showText} />;
    case IssuePriority.High:
      return <HighLabel showText={showText} />;
    case IssuePriority.Medium:
      return <MediumLabel showText={showText} />;
    case IssuePriority.Low:
      return <LowLabel showText={showText} />;
    default:
      return <NoneLabel showText={showText} />;
  }
}

function NoneLabel({ showText }: { showText: boolean }) {
  return (
    <div className="flex flex-row items-center gap-2 text-gray-500 dark:text-gray-500">
      <div className="w-5 h-5">
        <svg
          className="w-7 h-7 -my-2 -ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {/* Two short separators side by side */}
          <line
            x1="8"
            y1="16"
            x2="10"
            y2="16"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <line
            x1="14"
            y1="16"
            x2="16"
            y2="16"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </div>
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100 shrink-0">
          No priority
        </span>
      )}
    </div>
  );
}

function UrgentLabel({ showText }: { showText: boolean }) {
  return (
    <div className="flex flex-row items-center gap-2 text-orange-500 dark:text-orange-400">
      <div className="w-5 h-5">
        <svg
          className="w-7 h-7 -my-2 -ml-1"
          fill="currentColor"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {/* Rounded rectangle with exclamation mark inside */}
          <rect
            x="5"
            y="9"
            width="14"
            height="14"
            rx="2"
            ry="2"
            fill="currentColor"
          />
          <rect
            x="11.25"
            y="12"
            width="1.5"
            height="4"
            rx="0.5"
            className="fill-white stroke-white dark:fill-black dark:stroke-black"
          />
          <circle
            cx="12"
            cy="19.5"
            r="0.75"
            fill="white"
            stroke="white"
            className="dark:fill-black dark:stroke-black"
          />
        </svg>
      </div>
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100 shrink-0">
          Urgent
        </span>
      )}
    </div>
  );
}

function HighLabel({ showText }: { showText: boolean }) {
  return (
    <div className="flex flex-row items-center gap-2 text-gray-500 dark:text-gray-500">
      <div className="w-5 h-5">
        <svg
          className="w-7 h-7 -my-2 -ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {/* Signal strength - 3 bars full, moderate spacing, slightly rounded corners, thinner */}
          <rect
            x="5"
            y="16"
            width="2"
            height="4"
            rx="0.5"
            fill="currentColor"
          />
          <rect
            x="10"
            y="13"
            width="2"
            height="7"
            rx="0.5"
            fill="currentColor"
          />
          <rect
            x="15"
            y="10"
            width="2"
            height="10"
            rx="0.5"
            fill="currentColor"
          />
        </svg>
      </div>
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100 shrink-0">
          High
        </span>
      )}
    </div>
  );
}

function MediumLabel({ showText }: { showText: boolean }) {
  return (
    <div className="flex flex-row items-center gap-2 text-gray-500 dark:text-gray-500">
      <div className="w-5 h-5">
        <svg
          className="w-7 h-7 -my-2 -ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {/* Signal strength - 2 bars full, 1 bar faded, moderate spacing, slightly rounded corners, thinner */}
          <rect
            x="5"
            y="16"
            width="2"
            height="4"
            rx="0.5"
            fill="currentColor"
          />
          <rect
            x="10"
            y="13"
            width="2"
            height="7"
            rx="0.5"
            fill="currentColor"
          />
          <rect
            x="15"
            y="10"
            width="2"
            height="10"
            rx="0.5"
            fill="currentColor"
            opacity="0.3"
          />
        </svg>
      </div>

      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100 shrink-0">
          Medium
        </span>
      )}
    </div>
  );
}

function LowLabel({ showText }: { showText: boolean }) {
  return (
    <div className="flex flex-row items-center gap-2 text-gray-500 dark:text-gray-500">
      <div className="w-5 h-5">
        <svg
          className="w-7 h-7 -my-2 -ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {/* Signal strength - 1 bar full, 2 bars faded, moderate spacing, slightly rounded corners, thinner */}
          <rect
            x="5"
            y="16"
            width="2"
            height="4"
            rx="0.5"
            fill="currentColor"
          />
          <rect
            x="10"
            y="13"
            width="2"
            height="7"
            rx="0.5"
            fill="currentColor"
            opacity="0.3"
          />
          <rect
            x="15"
            y="10"
            width="2"
            height="10"
            rx="0.5"
            fill="currentColor"
            opacity="0.3"
          />
        </svg>
      </div>
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100 shrink-0">
          Low
        </span>
      )}
    </div>
  );
}
