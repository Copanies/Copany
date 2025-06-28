"use client";

import { useState, useRef, useEffect } from "react";
import { IssueState } from "@/types/database.types";
import { updateIssueStateAction } from "@/actions/issue.actions";

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
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    alignRight: false,
    showAbove: false,
  });
  const [shouldShowDropdown, setShouldShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 计算下拉菜单位置
  const calculateDropdownPosition = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 192; // w-48 = 12rem = 192px

    // 获取实际高度
    const actualHeight = dropdownContentRef.current?.offsetHeight;

    // 如果没有实际高度，不显示下拉菜单
    if (!actualHeight) {
      setShouldShowDropdown(false);
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 使用相对于视窗的坐标，不需要加上滚动位置
    let top = buttonRect.bottom;
    let left = buttonRect.left;
    let alignRight = false;
    let showAbove = false;

    // 检查各种显示可能性
    const canShowBelow = buttonRect.bottom + actualHeight <= viewportHeight;
    const canShowLeftAligned = buttonRect.left + dropdownWidth <= viewportWidth;
    const canShowRightAligned = buttonRect.right - dropdownWidth >= 0;

    if (canShowBelow) {
      // 在下方显示，顶边紧贴按钮底边
      top = buttonRect.bottom;
      if (canShowLeftAligned) {
        // 左对齐：菜单左边与按钮左边对齐
        left = buttonRect.left;
      } else if (canShowRightAligned) {
        // 右对齐：菜单右边与按钮右边对齐
        left = buttonRect.right - dropdownWidth;
        alignRight = true;
      } else {
        // 都不行则居中显示，确保不超出屏幕
        left = Math.max(
          0,
          Math.min(buttonRect.left, viewportWidth - dropdownWidth)
        );
      }
    } else {
      // 在上方显示，底边紧贴按钮顶边
      showAbove = true;
      top = buttonRect.top - actualHeight;
      if (canShowLeftAligned) {
        // 左对齐：菜单左边与按钮左边对齐
        left = buttonRect.left;
      } else if (canShowRightAligned) {
        // 右对齐：菜单右边与按钮右边对齐
        left = buttonRect.right - dropdownWidth;
        alignRight = true;
      } else {
        // 都不行则居中显示，确保不超出屏幕
        left = Math.max(
          0,
          Math.min(buttonRect.left, viewportWidth - dropdownWidth)
        );
      }
    }

    setDropdownPosition({ top, left, alignRight, showAbove });
    setShouldShowDropdown(true);
  };

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

  // 当下拉菜单打开时计算位置
  useEffect(() => {
    if (isOpen) {
      // 重置显示状态
      setShouldShowDropdown(false);

      // 延迟一帧确保DOM已渲染，然后计算位置
      requestAnimationFrame(() => {
        calculateDropdownPosition();
      });

      // 监听窗口大小变化和滚动事件
      const handleResize = () => calculateDropdownPosition();
      const handleScroll = () => calculateDropdownPosition();

      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleScroll);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll);
      };
    } else {
      setShouldShowDropdown(false);
    }
  }, [isOpen]);

  const handleStateChange = async (newState: IssueState) => {
    try {
      setCurrentState(newState);
      setIsOpen(false);
      setShouldShowDropdown(false);

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

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
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
        ref={buttonRef}
        onClick={toggleDropdown}
        className={`inline-flex items-center -mx-2 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${"hover:opacity-80 cursor-pointer"} ${
          showBackground
            ? "bg-gray-100 dark:bg-gray-800"
            : "bg-transparent dark:bg-transparent"
        }`}
      >
        {renderStateLabel(currentState, showText)}
      </button>

      {isOpen && (
        <>
          {/* 隐藏的DOM元素用于计算高度 */}
          <div
            ref={dropdownContentRef}
            className="fixed invisible px-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50"
            style={{ top: "-9999px", left: "-9999px" }}
          >
            <div className="py-1">
              {allStates.map((value) => (
                <button
                  key={value}
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

          {/* 实际显示的下拉菜单 */}
          {shouldShowDropdown && (
            <div
              className="fixed px-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
              }}
            >
              <div className="py-1">
                {allStates.map((value) => (
                  <button
                    key={value}
                    onClick={(e) => {
                      e.stopPropagation(); // 阻止事件冒泡
                      handleStateChange(value);
                    }}
                    className={`flex flex-row items-center justify-between w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 rounded-md cursor-pointer`}
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
        </>
      )}
    </div>
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
