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
    const handleClick = () => {
      onClose();
    };

    if (show) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg py-1 min-w-[120px]"
      style={{
        left: x,
        top: y,
      }}
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
          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed ${
            item.className || "text-gray-700 dark:text-gray-300"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
