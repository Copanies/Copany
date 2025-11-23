"use client";

import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";
import * as Tooltip from "@radix-ui/react-tooltip";

interface DropdownOption {
  value: number;
  label: ReactNode;
  disabled?: boolean;
  tooltip?: ReactNode;
  divider?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  options: DropdownOption[];
  selectedValue: number | null;
  onSelect: (value: number) => void;
  showBackground?: boolean;
  showBorder?: boolean;
  className?: string;
  showPadding?: boolean;
  marginX?: number;
  header?: ReactNode; // 新增可选头部容器
  size?: "sm" | "md" | "lg";
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

export default function Dropdown({
  trigger,
  options,
  selectedValue,
  onSelect,
  showBackground = false,
  showBorder = false,
  showPadding = true,
  marginX = 0,
  size = "md",
  className = "",
  header,
  onOpenChange,
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    alignRight: false,
    showAbove: false,
  });
  const [shouldShowDropdown, setShouldShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  const dropdownPortalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // 计算下拉菜单位置
  const calculateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth =
      size === "sm" ? 128 : size === "md" ? 192 : size === "lg" ? 320 : 192;

    // 获取实际高度，但要考虑最大高度限制
    const actualHeight = dropdownContentRef.current?.offsetHeight;
    const maxHeight = 512; // max-h-128 对应的像素值
    const effectiveHeight = actualHeight
      ? Math.min(actualHeight, maxHeight)
      : maxHeight;

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

    // 检查各种显示可能性 - 使用有效高度而不是实际高度
    const canShowBelow = buttonRect.bottom + effectiveHeight <= viewportHeight;
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
      // 在上方显示，底边紧贴按钮顶边 - 使用有效高度
      showAbove = true;
      top = buttonRect.top - effectiveHeight;
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
  }, [size]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Check if click is outside both the trigger container and the portal dropdown
      const isClickOutsideTrigger =
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node);
      const isClickOutsidePortal =
        dropdownPortalRef.current &&
        !dropdownPortalRef.current.contains(event.target as Node);

      if (isClickOutsideTrigger && isClickOutsidePortal) {
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
  }, [isOpen, calculateDropdownPosition]);

  // 通知外部打开/关闭状态变化
  useEffect(() => {
    if (typeof onOpenChange === "function") {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);

  const handleSelect = async (value: number) => {
    console.log("Dropdown handleSelect called with value:", value);
    try {
      setIsOpen(false);
      setShouldShowDropdown(false);
      console.log("Calling onSelect with value:", value);
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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={`w-full flex items-center rounded-md text-base font-base transition-all duration-200 ${
          disabled ? "" : "hover:opacity-80 cursor-pointer"
        } ${
          showBackground
            ? "bg-gray-100 dark:bg-gray-800"
            : "bg-transparent dark:bg-transparent"
        } ${marginX > 0 ? `-mx-${marginX}` : ""} ${
          showBorder
            ? "border border-gray-300 dark:border-gray-700 !px-3 !py-2"
            : ""
        } ${showPadding ? `px-2 py-1` : "p-0"}`}
      >
        {trigger}
      </button>

      {isOpen && !disabled && (
        <>
          {/* 隐藏的DOM元素用于计算高度 */}
          <div
            ref={dropdownContentRef}
            className={`fixed invisible px-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[100] ${
              size === "sm"
                ? "w-32"
                : size === "md"
                ? "w-48"
                : size === "lg"
                ? "w-80"
                : "w-48"
            }`}
            style={{ top: "-9999px", left: "-9999px" }}
          >
            {header && (
              <div className="px-2 py-3 border-b border-gray-200 dark:border-gray-600">
                {header}
              </div>
            )}
            <div className="py-1 max-h-128 overflow-y-auto">
              {options.map((option) => {
                if (option.divider) {
                  return (
                    <hr
                      key={option.value}
                      className="my-1 border-gray-200 dark:border-gray-700"
                    />
                  );
                }
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`group relative flex flex-row items-center justify-between w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 rounded-md ${
                      size === "sm"
                        ? "text-sm"
                        : size === "md"
                        ? "text-base"
                        : size === "lg"
                        ? "text-base"
                        : "text-base"
                    } ${
                      option.value === selectedValue
                        ? "bg-gray-100 dark:bg-gray-700 font-base"
                        : ""
                    } ${
                      option.disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <Tooltip.Provider
                      delayDuration={150}
                      skipDelayDuration={300}
                    >
                      <Tooltip.Root
                        open={
                          option.disabled && option.tooltip ? undefined : false
                        }
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
                );
              })}
            </div>
          </div>

          {/* 实际显示的下拉菜单 */}
          {(shouldShowDropdown &&
            mounted &&
            createPortal(
              <div
                ref={dropdownPortalRef}
                className={`fixed my-1 px-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[100] ${
                  size === "sm"
                    ? "w-32"
                    : size === "md"
                    ? "w-48"
                    : size === "lg"
                    ? "w-80"
                    : "w-48"
                }`}
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {header && (
                  <div className="px-2 py-3 border-b border-gray-200 dark:border-gray-600">
                    {header}
                  </div>
                )}
                <div className="py-1 max-h-128 overflow-y-auto">
                  {options.map((option) => {
                    if (option.divider) {
                      return (
                        <hr
                          key={option.value}
                          className="my-1 border-gray-200 dark:border-gray-700"
                        />
                      );
                    }
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation(); // 阻止事件冒泡
                          if (option.disabled) return;
                          handleSelect(option.value);
                        }}
                        className={`group relative flex flex-row items-center justify-between w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 rounded-md ${
                          size === "sm"
                            ? "text-sm"
                            : size === "md"
                            ? "text-base"
                            : size === "lg"
                            ? "text-base"
                            : "text-base"
                        } ${
                          option.disabled
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                      >
                        <Tooltip.Provider
                          delayDuration={150}
                          skipDelayDuration={300}
                        >
                          <Tooltip.Root
                            open={
                              option.disabled && option.tooltip
                                ? undefined
                                : false
                            }
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
                    );
                  })}
                </div>
              </div>,
              document.body
            )) ||
            null}
        </>
      )}
    </div>
  );
}
