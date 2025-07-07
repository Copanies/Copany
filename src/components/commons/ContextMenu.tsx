"use client";

import { useEffect } from "react";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

interface ContextMenuProps {
  show: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({
  show,
  x,
  y,
  items,
  onClose,
}: ContextMenuProps) {
  // 点击其他地方关闭菜单
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // 检查点击是否在菜单内部
      const target = event.target as HTMLElement;
      if (target.closest(".context-menu")) {
        return; // 如果点击在菜单内部，不关闭菜单
      }
      // 阻止事件传播，防止触发被点击元素的点击事件
      event.stopPropagation();
      event.preventDefault();
      onClose();
    };

    if (show) {
      // 使用 capture 阶段来确保我们能够先处理事件
      document.addEventListener("click", handleClick, true);
      return () => document.removeEventListener("click", handleClick, true);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      className="context-menu fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg p-1 min-w-[120px]"
      style={{
        left: x,
        top: y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
            }
          }}
          disabled={item.disabled}
          className={`block w-full text-left px-4 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            item.className || "text-gray-900 dark:text-gray-100"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
