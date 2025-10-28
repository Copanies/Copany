"use client";

import Image from "next/image";
import {
  DocumentDuplicateIcon,
  CheckIcon,
  AtSymbolIcon,
} from "@heroicons/react/24/outline";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import COP_Tooltip from "@/components/commons/COP_Tooltip";
import { useState } from "react";
import { useUserProviders } from "@/hooks/userProviders";
import Link from "next/link";
import googleIcon from "@/assets/google_logo.webp";
import githubIconBlack from "@/assets/github_logo.svg";
import githubIconWhite from "@/assets/github_logo_dark.svg";
import figmaIcon from "@/assets/figma_logo.svg";
import discordIcon from "@/assets/discord_logo.svg";
import discordIconDark from "@/assets/discord_logo_dark.svg";
import Button from "./Button";

interface UserAvatarProps {
  userId: string;
  name: string;
  avatarUrl: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

export default function UserAvatar({
  userId,
  name,
  avatarUrl,
  email,
  size = "md",
  showTooltip = true,
}: UserAvatarProps) {
  const isDarkMode = useDarkMode();
  const [copied, setCopied] = useState(false);

  // Get user providers information
  const { data: providers = [], isLoading: providersLoading } =
    useUserProviders(userId);

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

  // Get provider display info
  const githubProvider = providers.find((p) => p.provider === "github");
  const googleProvider = providers.find((p) => p.provider === "google");
  const figmaProvider = providers.find((p) => p.provider === "figma");
  const discordProvider = providers.find((p) => p.provider === "discord");
  const emailProvider = providers.find((p) => p.provider === "email");

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
      className="flex items-begin gap-2 hover:cursor-pointer"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="pt-2">
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
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0">
          <span className="text-base font-medium">{name}</span>
          {/* Email */}
          {email && (
            <div className="flex items-center gap-1">
              <span className="text-sm">{email}</span>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleCopyEmail}
                shape="square"
              >
                {copied ? (
                  <CheckIcon className="w-3 h-3" />
                ) : (
                  <DocumentDuplicateIcon className="w-3 h-3" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Providers List */}
        {(githubProvider ||
          googleProvider ||
          figmaProvider ||
          discordProvider) && (
          <div className="flex flex-col gap-2 mt-1">
            {/* GitHub */}
            {githubProvider && githubProvider.user_name && (
              <div className="flex items-center gap-2">
                <Image
                  className="w-4 h-4"
                  alt="GitHub Logo"
                  src={isDarkMode ? githubIconWhite : githubIconBlack}
                  width={16}
                  height={16}
                />
                <Link
                  href={`https://github.com/${githubProvider.user_name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  @{githubProvider.user_name}
                </Link>
              </div>
            )}

            {/* Figma */}
            {figmaProvider && figmaProvider.user_name && (
              <div className="flex items-center gap-2">
                <Image
                  className="w-4 h-4"
                  alt="Figma Logo"
                  src={figmaIcon}
                  width={16}
                  height={16}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  @{figmaProvider.user_name}
                </span>
              </div>
            )}

            {/* Discord */}
            {discordProvider && discordProvider.id && (
              <div className="flex items-center gap-2">
                <Image
                  className="w-4 h-4"
                  alt="Discord Logo"
                  src={isDarkMode ? discordIconDark : discordIcon}
                  width={16}
                  height={16}
                />
                <Link
                  href={`https://discord.com/users/${discordProvider.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {discordProvider.user_name
                    ? `@${discordProvider.user_name}`
                    : "Discord"}
                </Link>
              </div>
            )}
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
