import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

// 弹窗组件
export default function Modal({
  isOpen,
  onClose,
  children,
  size = "md",
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-gray-700/30"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div
        className={`relative bg-white dark:bg-black rounded-lg shadow-xl w-full mx-4 max-h-[90vh] overflow-y-auto ${
          size === "sm" ? "max-w-md" : size === "md" ? "max-w-2xl" : "max-w-4xl"
        }`}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl leading-none cursor-pointer"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* 弹窗内容 */}
        <div>{children}</div>
      </div>
    </div>
  );
}
