"use client";

import React, { useState, useEffect } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useIsMobile } from "@/utils/deviceDetection";

interface COP_TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  align?: "start" | "center" | "end";
  className?: string;
  delayDuration?: number;
  skipDelayDuration?: number;
  disabled?: boolean;
}

/**
 * 移动友好的 Tooltip 组件
 * 在桌面设备上使用 hover 触发，在移动设备上使用长按触发
 */
export default function COP_Tooltip({
  content,
  children,
  side = "bottom",
  sideOffset = 8,
  align = "center",
  className = "tooltip-surface",
  delayDuration = 150,
  skipDelayDuration = 300,
  disabled = false,
}: COP_TooltipProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  // 点击外部关闭 tooltip (只在移动设备上使用)
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleClickOutside = () => {
      setIsOpen(false);
    };

    // 延迟添加事件监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isMobile, isOpen]);

  // 如果禁用了 tooltip，直接返回子元素
  if (disabled) {
    return <>{children}</>;
  }

  // 清理定时器，防止内存泄漏
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  // 移动设备上的处理
  if (isMobile) {
    const handleTouchStart = (e: React.TouchEvent) => {
      // 防止默认行为（如文本选择、长按菜单）
      e.preventDefault();

      // 设置长按定时器（500ms）
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);

      setLongPressTimer(timer);
    };

    const handleTouchEnd = () => {
      // 清除定时器，取消长按
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    };

    const handleTouchMove = () => {
      // 如果手指移动，取消长按
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    };

    return (
      <Tooltip.Provider
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
      >
        <Tooltip.Root open={isOpen} onOpenChange={setIsOpen}>
          <Tooltip.Trigger asChild>
            <span
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
              className="inline-block"
            >
              {children}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side={side}
              sideOffset={sideOffset}
              align={align}
              className={className}
              onPointerDownOutside={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
            >
              {content}
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  // 桌面设备上使用默认的 hover 行为
  return (
    <Tooltip.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
    >
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className="inline-block">{children}</span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            sideOffset={sideOffset}
            align={align}
            className={className}
          >
            {content}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
