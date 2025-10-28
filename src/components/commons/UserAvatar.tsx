"use client";

import Image from "next/image";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/outline";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import COP_Tooltip from "@/components/commons/COP_Tooltip";
import { useState } from "react";

interface UserAvatarProps {
  name: string;
  avatarUrl: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

export default function UserAvatar({
  name,
  avatarUrl,
  email,
  size = "md",
  showTooltip = true,
  className = "",
}: UserAvatarProps) {
  const isDarkMode = useDarkMode();
  const [copied, setCopied] = useState(false);

  // Size configuration
  const sizeClasses = {
    sm: {
      container: "w-5 h-5",
      imageSize: 20,
      fontSize: "text-xs",
    },
    md: {
      container: "w-[22px] h-[22px]",
      imageSize: 22,
      fontSize: "text-sm",
    },
    lg: {
      container: "w-8 h-8",
      imageSize: 32,
      fontSize: "text-sm",
    },
  };

  const config = sizeClasses[size];
  const initials = name.slice(0, 1).toUpperCase();

  // Handle email copy
  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!email) return;

    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy email:", err);
    }
  };

  // Render the avatar image or fallback
  const avatarContent = avatarUrl ? (
    <Image
      src={avatarUrl}
      alt={name}
      width={config.imageSize}
      height={config.imageSize}
      className={`${config.container} rounded-full hover:cursor-pointer flex-shrink-0`}
      placeholder="blur"
      blurDataURL={shimmerDataUrlWithTheme(
        config.imageSize,
        config.imageSize,
        isDarkMode
      )}
      style={{ display: "block" }}
    />
  ) : (
    <div
      className={`${config.container} bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center ${config.fontSize} font-medium text-gray-600 dark:text-gray-300 hover:cursor-pointer flex-shrink-0`}
    >
      {initials}
    </div>
  );

  // If no tooltip or no email, just return the avatar
  if (!showTooltip || !email) {
    return avatarContent;
  }

  // Tooltip content
  const tooltipContent = (
    <div
      className="flex items-center gap-2 hover:cursor-pointer"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          width={28}
          height={28}
          className="w-7 h-7 rounded-full"
          placeholder="blur"
          blurDataURL={shimmerDataUrlWithTheme(28, 28, isDarkMode)}
        />
      ) : (
        <div className="w-7 h-7 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
          {initials}
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-sm font-medium">{name}</span>
        {email && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {email}
            </span>
            <button
              onClick={handleCopyEmail}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors hover:cursor-pointer"
              title="Copy email"
              type="button"
            >
              {copied ? (
                <CheckIcon className="w-3 h-3" />
              ) : (
                <DocumentDuplicateIcon className="w-3 h-3" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <COP_Tooltip
      content={tooltipContent}
      side="left"
      sideOffset={8}
      align="center"
    >
      {avatarContent}
    </COP_Tooltip>
  );
}
