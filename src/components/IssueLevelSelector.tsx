"use client";

import { useState } from "react";
import { IssueLevel } from "@/types/database.types";
import { updateIssueLevelAction } from "@/actions/issue.actions";
import Dropdown from "@/components/commons/Dropdown";

interface IssueLevelSelectorProps {
  issueId: string;
  initialLevel: number | null;
  showBackground?: boolean;
  onLevelChange?: (issueId: string, newLevel: number) => void;
}

export default function IssueLevelSelector({
  issueId,
  initialLevel,
  showBackground = false,
  onLevelChange,
}: IssueLevelSelectorProps) {
  const [currentLevel, setCurrentLevel] = useState(initialLevel);

  const handleLevelChange = async (newLevel: number) => {
    try {
      setCurrentLevel(newLevel);

      // 立即调用回调更新前端状态，提供即时反馈
      if (onLevelChange) {
        onLevelChange(issueId, newLevel);
      }

      // 然后调用更新等级接口
      await updateIssueLevelAction(issueId, newLevel);

      console.log("Level updated successfully:", newLevel);
    } catch (error) {
      console.error("Error updating level:", error);
      // 出错时回滚状态
      setCurrentLevel(initialLevel);
      // 如果有回调，也需要回滚前端状态
      if (onLevelChange && initialLevel !== null) {
        onLevelChange(issueId, initialLevel);
      }
    }
  };

  // 获取所有可用等级
  const allLevels = [
    IssueLevel.level_None,
    IssueLevel.level_C,
    IssueLevel.level_B,
    IssueLevel.level_A,
    IssueLevel.level_S,
  ];

  const levelOptions = allLevels.map((level) => ({
    value: level,
    label: renderLevelLabel(level),
  }));

  return (
    <Dropdown
      trigger={renderLevelLabel(currentLevel)}
      options={levelOptions}
      selectedValue={currentLevel}
      onSelect={handleLevelChange}
      showBackground={showBackground}
    />
  );
}

export function renderLevelLabel(level: number | null) {
  const getLevelDisplay = (level: number | null) => {
    switch (level) {
      case IssueLevel.level_None:
        return { symbol: "None" };
      case IssueLevel.level_C:
        return { symbol: "C" };
      case IssueLevel.level_B:
        return { symbol: "B" };
      case IssueLevel.level_A:
        return { symbol: "A" };
      case IssueLevel.level_S:
        return { symbol: "S" };
      default:
        return { symbol: "None" };
    }
  };

  const { symbol } = getLevelDisplay(level);

  return (
    <div className="flex flex-row items-center gap-2">
      <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-full px-2 py-[2px] min-w-[28px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">
          {symbol}
        </span>
      </div>
    </div>
  );
}
