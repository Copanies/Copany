"use client";

import { Platform } from "@/types/database.types";
import Image from "next/image";
import { useDarkMode } from "@/utils/useDarkMode";
import { useState, useEffect } from "react";
import IphoneIcon from "@/assets/iphone.svg";
import MacbookIcon from "@/assets/macbook.svg";
import ApplewatchIcon from "@/assets/applewatch.svg";
import AppletvIcon from "@/assets/tv.svg";
import AppleVisionProIcon from "@/assets/apple_vision_pro.svg";
import WebsiteIcon from "@/assets/website_logo.svg";
import WebsiteDarkIcon from "@/assets/website_logo_dark.svg";

interface PlatformIconsProps {
  platforms: Platform[] | null | undefined;
  size?: "sm" | "md";
}

// Platform icon mapping
type IconType = typeof IphoneIcon;
const platformIconMap: Record<Platform, { light: IconType; dark?: IconType }> = {
  [Platform.iOS]: { light: IphoneIcon },
  [Platform.iPadOS]: { light: IphoneIcon },
  [Platform.macOS]: { light: MacbookIcon },
  [Platform.watchOS]: { light: ApplewatchIcon },
  [Platform.tvOS]: { light: AppletvIcon },
  [Platform.visionOS]: { light: AppleVisionProIcon },
  [Platform.Web]: { light: WebsiteIcon, dark: WebsiteDarkIcon },
};

// Platform display labels
const platformLabels: Record<Platform, string> = {
  [Platform.iOS]: "iOS",
  [Platform.iPadOS]: "iPadOS",
  [Platform.macOS]: "macOS",
  [Platform.watchOS]: "watchOS",
  [Platform.tvOS]: "tvOS",
  [Platform.visionOS]: "visionOS",
  [Platform.Web]: "Web",
};

export default function PlatformIcons({
  platforms,
  size = "md",
}: PlatformIconsProps) {
  const isDarkMode = useDarkMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!platforms || platforms.length === 0) {
    return null;
  }

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
  };

  // Smaller icons for iPhone, Apple TV, Apple Watch, and Web
  const smallerSizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
  };

  const iconWidth = size === "sm" ? 20 : 24;
  const iconHeight = size === "sm" ? 20 : 24;

  // Smaller icon dimensions
  const smallerIconWidth = size === "sm" ? 16 : 20;
  const smallerIconHeight = size === "sm" ? 16 : 20;

  const gapClasses = {
    sm: "gap-1.5",
    md: "gap-2",
  };

  // Platforms that use smaller icon size
  const smallerPlatforms = [
    Platform.iOS,
    Platform.iPadOS,
    Platform.tvOS,
    Platform.watchOS,
    Platform.Web,
  ];

  return (
    <div className={`flex flex-row items-center ${gapClasses[size]}`}>
      {platforms.map((platform) => {
        const iconConfig = platformIconMap[platform];
        if (!iconConfig) return null;

        // Use dark icon if available and dark mode is active, otherwise use light icon
        const iconSrc =
          mounted && isDarkMode && iconConfig.dark
            ? iconConfig.dark
            : iconConfig.light;

        // Check if platform uses smaller size
        const usesSmallerSize = smallerPlatforms.includes(platform);
        const iconSizeClass = usesSmallerSize
          ? smallerSizeClasses[size]
          : sizeClasses[size];
        const iconW = usesSmallerSize ? smallerIconWidth : iconWidth;
        const iconH = usesSmallerSize ? smallerIconHeight : iconHeight;

        // White icons need filter to show as black in light mode and white in dark mode
        // Web platform has its own dark icon, so no filter needed
        const needsColorFilter = platform !== Platform.Web;
        const colorFilterClass = needsColorFilter
          ? "brightness-0 dark:brightness-100"
          : "";

        return (
          <Image
            key={platform}
            src={iconSrc}
            alt={platformLabels[platform]}
            className={`${iconSizeClass} ${colorFilterClass}`}
            width={iconW}
            height={iconH}
            title={platformLabels[platform]}
          />
        );
      })}
    </div>
  );
}
