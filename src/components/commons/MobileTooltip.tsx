"use client";

import React, { useState, useEffect } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useIsMobile } from "@/utils/deviceDetection";

interface MobileTooltipProps {
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
 * 在桌面设备上使用 hover 触发，在移动设备上使用点击触发
 */
export default function MobileTooltip({
  content,
  children,
  side = "bottom",
  sideOffset = 8,
  align = "center",
  className = "tooltip-surface",
  delayDuration = 150,
  skipDelayDuration = 300,
  disabled = false,
}: MobileTooltipProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

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

  // 移动设备上的处理
  if (isMobile) {
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(!isOpen);
    };

    return (
      <Tooltip.Provider
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
      >
        <Tooltip.Root open={isOpen} onOpenChange={setIsOpen}>
          <Tooltip.Trigger asChild>
            <div onClick={handleClick} style={{ display: "inline-block" }}>
              {children}
            </div>
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
              <Tooltip.Arrow className="fill-white dark:fill-gray-900" />
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
          <div style={{ display: "inline-block" }}>{children}</div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            sideOffset={sideOffset}
            align={align}
            className={className}
          >
            {content}
            <Tooltip.Arrow className="fill-white dark:fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
