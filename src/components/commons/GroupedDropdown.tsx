"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

interface GroupedDropdownOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
  tooltip?: ReactNode;
}

interface GroupedDropdownGroup {
  title: string | null;
  options: GroupedDropdownOption[];
}

interface GroupedDropdownProps {
  trigger: ReactNode;
  groups: GroupedDropdownGroup[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  showBackground?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function GroupedDropdown({
  trigger,
  groups,
  selectedValue,
  onSelect,
  showBackground = false,
  className = "",
  disabled = false,
}: GroupedDropdownProps) {
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
        // 阻止事件传播，防止触发被点击元素的点击事件
        event.stopPropagation();
        event.preventDefault();
        setIsOpen(false);
        setShouldShowDropdown(false);
      }
    }

    // 只在下拉菜单打开时监听点击外部事件
    if (isOpen) {
      // 使用 capture 阶段来确保我们能够先处理事件
      document.addEventListener("click", handleClickOutside, true);
      return () => {
        document.removeEventListener("click", handleClickOutside, true);
      };
    }
  }, [isOpen]);

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

  const handleSelect = async (value: string) => {
    try {
      setIsOpen(false);
      setShouldShowDropdown(false);
      onSelect(value);
    } catch (error) {
      console.error("Error selecting value:", error);
    }
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  const renderDropdownContent = () => (
    <div className="py-1">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex}>
          {/* 分组标题 */}
          {group.title && (
            <div className="px-3 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
              {group.title}
            </div>
          )}

          {/* 分组选项 */}
          {group.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // 阻止事件冒泡
                if (option.disabled) return;
                handleSelect(option.value);
              }}
              className={`group relative flex flex-row items-center justify-between w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 rounded-md ${
                option.value === selectedValue
                  ? "bg-gray-100 dark:bg-gray-700 font-base"
                  : ""
              } ${
                option.disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              <Tooltip.Provider delayDuration={150}>
                <Tooltip.Root
                  open={option.disabled && option.tooltip ? undefined : false}
                >
                  <Tooltip.Trigger asChild>
                    <div className="flex-1 flex items-center justify-between">
                      {option.label}
                      {option.value === selectedValue && (
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
                    </div>
                  </Tooltip.Trigger>
                  {option.disabled && option.tooltip && (
                    <Tooltip.Portal>
                      <Tooltip.Content
                        side="right"
                        sideOffset={8}
                        align="center"
                        className="tooltip-surface"
                      >
                        {option.tooltip}
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  )}
                </Tooltip.Root>
              </Tooltip.Provider>
            </button>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={`relative ${className} flex items-center`}
      ref={dropdownRef}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-base transition-all duration-200 ${
          disabled ? "" : "hover:opacity-80 cursor-pointer"
        } ${
          showBackground
            ? "bg-gray-100 dark:bg-gray-800"
            : "bg-transparent dark:bg-transparent -mx-2"
        }`}
      >
        {trigger}
      </button>

      {isOpen && !disabled && (
        <>
          {/* 隐藏的DOM元素用于计算高度 */}
          <div
            ref={dropdownContentRef}
            className="fixed invisible px-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50"
            style={{ top: "-9999px", left: "-9999px" }}
          >
            {renderDropdownContent()}
          </div>

          {/* 实际显示的下拉菜单 */}
          {shouldShowDropdown && (
            <div
              className="fixed my-1 px-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {renderDropdownContent()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
