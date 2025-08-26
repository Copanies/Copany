import Image from "next/image";
import { useDarkMode } from "@/utils/useDarkMode";
import InreviewIcon from "@/assets/in_review_state.svg";
import InreviewDarkIcon from "@/assets/in_review_state_dark.svg";

export type StatusType = "in_progress" | "in_review" | "confirmed";

interface StatusLabelProps {
  status: StatusType;
  showText?: boolean;
  colorful?: boolean;
}

export default function StatusLabel({
  status,
  showText = true,
  colorful = true,
}: StatusLabelProps) {
  const isDarkMode = useDarkMode();

  if (status === "in_progress") {
    return (
      <div
        className={`flex flex-row items-center gap-1 ${
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

  if (status === "in_review") {
    return (
      <div
        className={`flex flex-row items-center gap-1 ${
          colorful ? "text-indigo-600" : "text-gray-500 dark:text-gray-500"
        }`}
      >
        <Image
          src={isDarkMode ? InreviewDarkIcon : InreviewIcon}
          width={20}
          height={20}
          alt="In Review"
        />
        {showText && (
          <span className="text-base text-gray-900 dark:text-gray-100">
            In Review
          </span>
        )}
      </div>
    );
  }

  if (status === "confirmed") {
    return (
      <div
        className={`flex flex-row items-center gap-1 ${
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
          <span className="text-base text-gray-900 dark:text-gray-100">
            Confirmed
          </span>
        )}
      </div>
    );
  }

  return null;
}
