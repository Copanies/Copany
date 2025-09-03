"use client";

import { useState, useRef, useEffect } from "react";
import { IssueLevel } from "@/types/database.types";
import { updateIssueLevelAction } from "@/actions/issue.actions";
import { useUpdateIssueLevel } from "@/hooks/issues";
import Dropdown from "@/components/commons/Dropdown";
import { useQueryClient } from "@tanstack/react-query";

interface IssueLevelSelectorProps {
  issueId: string;
  initialLevel: number | null;
  showText: boolean;
  showBackground?: boolean;
  onLevelChange?: (issueId: string, newLevel: number) => void;
  disableServerUpdate?: boolean;
  readOnly?: boolean;
  copanyId?: string;
}

export default function IssueLevelSelector({
  issueId,
  initialLevel,
  showText,
  showBackground = false,
  onLevelChange,
  disableServerUpdate = false,
  readOnly = false,
  copanyId,
}: IssueLevelSelectorProps) {
  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const mutation = useUpdateIssueLevel(copanyId || "");
  const qc = useQueryClient();

  // 使用 useRef 稳定 mutation 方法，避免 effect 依赖整个对象
  const mutateRef = useRef(mutation.mutateAsync);
  useEffect(() => {
    mutateRef.current = mutation.mutateAsync;
  }, [mutation.mutateAsync]);

  const handleLevelChange = async (newLevel: number) => {
    if (readOnly) return;
    try {
      setCurrentLevel(newLevel);

      // Immediately call callback to update frontend state, provide instant feedback
      if (onLevelChange) {
        onLevelChange(issueId, newLevel);
      }

      // Only call the update level API when not in creation mode
      if (!disableServerUpdate) {
        if (copanyId) {
          await mutateRef.current({ issueId, level: newLevel });
        } else {
          await updateIssueLevelAction(issueId, newLevel);
        }
        console.log("Level updated successfully:", newLevel);

        // 等级变化会产生活动，触发活动流查询失效
        try {
          await qc.invalidateQueries({ queryKey: ["issueActivity", issueId] });
        } catch (_) {}
      }
    } catch (error) {
      console.error("Error updating level:", error);
      // Rollback state on error
      setCurrentLevel(initialLevel);
      // If there's a callback, also need to rollback frontend state
      if (onLevelChange && initialLevel !== null) {
        onLevelChange(issueId, initialLevel);
      }
    }
  };

  // Get all available levels
  const allLevels = [
    IssueLevel.level_None,
    IssueLevel.level_C,
    IssueLevel.level_B,
    IssueLevel.level_A,
    IssueLevel.level_S,
  ];

  const levelOptions = allLevels.map((level) => ({
    value: level,
    label: renderLevelLabel(level, true, true),
    disabled: readOnly,
    tooltip: readOnly ? "No permission to edit" : undefined,
  }));

  return (
    <Dropdown
      size="lg"
      trigger={renderLevelLabel(currentLevel, showText, false)}
      options={levelOptions}
      selectedValue={currentLevel}
      onSelect={handleLevelChange}
      showBackground={showBackground}
      disabled={false}
    />
  );
}

export function renderLevelLabel(
  level: number | null,
  showText: boolean,
  showDescription: boolean = false
) {
  const getLevelDisplay = (level: number | null) => {
    switch (level) {
      case IssueLevel.level_None:
        return {
          symbol: "?",
          text: "Pending",
          description: "To be determined",
        };
      case IssueLevel.level_C:
        return {
          symbol: "C",
          text: "Level C",
          description: "Small fixes / docs updates",
        };
      case IssueLevel.level_B:
        return {
          symbol: "B",
          text: "Level B",
          description: "Regular feature development",
        };
      case IssueLevel.level_A:
        return {
          symbol: "A",
          text: "Level A",
          description: "Core module or design",
        };
      case IssueLevel.level_S:
        return {
          symbol: "S",
          text: "Level S",
          description: "Architecture / core development",
        };
      default:
        return { symbol: "?", text: "Pending", description: "Unknown level" };
    }
  };

  const { symbol, text, description } = getLevelDisplay(level);

  return (
    <div className="flex flex-row items-center gap-2">
      <div className="border border-gray-300 dark:border-gray-600 rounded-full px-[6px] py-[1px] min-w-[24px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center ">
          {symbol}
        </span>
      </div>
      {showText && (
        <div className="flex flex-col gap-0">
          <span className="text-base text-gray-900 dark:text-gray-100">
            {text}
          </span>
          {showDescription && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
