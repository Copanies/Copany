"use client";

import { useState } from "react";
import { IssueLevel } from "@/types/database.types";
import { updateIssueLevelAction } from "@/actions/issue.actions";
import Dropdown from "@/components/commons/Dropdown";

interface IssueLevelSelectorProps {
  issueId: string;
  initialLevel: number | null;
  showText: boolean;
  showBackground?: boolean;
  onLevelChange?: (issueId: string, newLevel: number) => void;
  disableServerUpdate?: boolean;
  readOnly?: boolean;
}

export default function IssueLevelSelector({
  issueId,
  initialLevel,
  showText,
  showBackground = false,
  onLevelChange,
  disableServerUpdate = false,
  readOnly = false,
}: IssueLevelSelectorProps) {
  const [currentLevel, setCurrentLevel] = useState(initialLevel);

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
        await updateIssueLevelAction(issueId, newLevel);
        console.log("Level updated successfully:", newLevel);
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
    label: renderLevelLabel(level, true),
  }));

  return (
    <Dropdown
      trigger={renderLevelLabel(currentLevel, showText)}
      options={levelOptions}
      selectedValue={currentLevel}
      onSelect={handleLevelChange}
      showBackground={showBackground}
      disabled={readOnly}
    />
  );
}

export function renderLevelLabel(level: number | null, showText: boolean) {
  const getLevelDisplay = (level: number | null) => {
    switch (level) {
      case IssueLevel.level_None:
        return { symbol: "-", text: "Unknown level" };
      case IssueLevel.level_C:
        return { symbol: "C", text: "Level C" };
      case IssueLevel.level_B:
        return { symbol: "B", text: "Level B" };
      case IssueLevel.level_A:
        return { symbol: "A", text: "Level A" };
      case IssueLevel.level_S:
        return { symbol: "S", text: "Level S" };
      default:
        return { symbol: "-", text: "Unknown level" };
    }
  };

  const { symbol, text } = getLevelDisplay(level);

  return (
    <div className="flex flex-row items-center gap-2">
      <div className="border border-gray-300 dark:border-gray-600 rounded-full px-[6px] py-[1px] min-w-[24px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">
          {symbol}
        </span>
      </div>
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100">
          {text}
        </span>
      )}
    </div>
  );
}
