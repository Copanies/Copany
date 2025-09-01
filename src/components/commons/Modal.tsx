import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

// Modal component
export default function Modal({
  isOpen,
  onClose,
  children,
  size = "md",
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
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
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-gray-500/20"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className={`relative bg-background dark:bg-background-dark rounded-lg shadow-xl dark:border dark:border-gray-800 w-full mx-4 max-h-[90vh] overflow-y-auto ${
          size === "sm"
            ? "max-w-md"
            : size === "md"
            ? "max-w-2xl"
            : size === "lg"
            ? "max-w-3xl"
            : "max-w-5xl"
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl leading-none cursor-pointer"
        >
          <div className="flex flex-row h-[28px] items-center">
            <XMarkIcon className="w-6 h-6" />
          </div>
        </button>

        {/* Modal content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
