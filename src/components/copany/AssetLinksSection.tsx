import { Copany } from "@/types/database.types";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import GithubIcon from "@/assets/github_logo.svg";
import GithubDarkIcon from "@/assets/github_logo_dark.svg";
import FigmaIcon from "@/assets/figma_logo.svg";
import TelegramIcon from "@/assets/telegram_logo.svg";
import DiscordIcon from "@/assets/discord_logo.svg";
import DiscordDarkIcon from "@/assets/discord_logo_dark.svg";
import NotionIcon from "@/assets/notion_logo.png";
import NotionDarkIcon from "@/assets/notion_logo_dark.png";
import AppleAppStoreIcon from "@/assets/apple_app_store_logo.webp";
import GooglePlayStoreIcon from "@/assets/google_play_store_logo.png";
import WebsiteIcon from "@/assets/website_logo.svg";
import WebsiteDarkIcon from "@/assets/website_logo_dark.svg";
import { useState, useEffect } from "react";

export default function AssetLinksSection({
  copany,
  size = "md",
}: {
  copany: Copany;
  size?: "sm" | "md";
}) {
  const isDarkMode = useDarkMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use light theme icons before client-side mounting
  const currentGithubIcon = mounted && isDarkMode ? GithubDarkIcon : GithubIcon;
  const currentDiscordIcon =
    mounted && isDarkMode ? DiscordDarkIcon : DiscordIcon;
  const currentNotionIcon = mounted && isDarkMode ? NotionDarkIcon : NotionIcon;
  const currentWebsiteIcon =
    mounted && isDarkMode ? WebsiteDarkIcon : WebsiteIcon;
  const currentAppleAppStoreIcon =
    mounted && isDarkMode ? AppleAppStoreIcon : AppleAppStoreIcon;
  const currentGooglePlayStoreIcon =
    mounted && isDarkMode ? GooglePlayStoreIcon : GooglePlayStoreIcon;

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
  };

  const iconWidth = size === "sm" ? 16 : 20;
  const iconHeight = size === "sm" ? 16 : 20;

  const gapClasses = {
    sm: "gap-2",
    md: "gap-3",
  };

  return (
    <div className={`flex flex-row items-center ${gapClasses[size]}`}>
      {copany.apple_app_store_url && (
        <Image
          src={currentAppleAppStoreIcon}
          alt={copany.apple_app_store_url || ""}
          className={`${sizeClasses[size]} cursor-pointer`}
          width={iconWidth}
          height={iconHeight}
          placeholder="blur"
          blurDataURL={shimmerDataUrlWithTheme(
            iconWidth,
            iconHeight,
            isDarkMode
          )}
          onClick={() => {
            if (copany.apple_app_store_url) {
              window.open(copany.apple_app_store_url, "_blank");
            }
          }}
        />
      )}
      {copany.google_play_store_url && (
        <Image
          src={currentGooglePlayStoreIcon}
          alt={copany.google_play_store_url || ""}
          className={`${sizeClasses[size]} cursor-pointer`}
          width={iconWidth}
          height={iconHeight}
          placeholder="blur"
          blurDataURL={shimmerDataUrlWithTheme(
            iconWidth,
            iconHeight,
            isDarkMode
          )}
          onClick={() => {
            if (copany.google_play_store_url) {
              window.open(copany.google_play_store_url, "_blank");
            }
          }}
        />
      )}
      {copany.website_url && (
        <Image
          src={currentWebsiteIcon}
          alt={copany.website_url || ""}
          className={`${sizeClasses[size]} cursor-pointer`}
          width={iconWidth}
          height={iconHeight}
          placeholder="blur"
          blurDataURL={shimmerDataUrlWithTheme(
            iconWidth,
            iconHeight,
            isDarkMode
          )}
          onClick={() => {
            if (copany.website_url) {
              window.open(copany.website_url, "_blank");
            }
          }}
        />
      )}
      {copany.discord_url && (
        <Image
          src={currentDiscordIcon}
          alt={copany.discord_url || ""}
          className={`${sizeClasses[size]} cursor-pointer`}
          width={iconWidth}
          height={iconHeight}
          placeholder="blur"
          blurDataURL={shimmerDataUrlWithTheme(
            iconWidth,
            iconHeight,
            isDarkMode
          )}
          onClick={() => {
            if (copany.discord_url) {
              window.open(copany.discord_url, "_blank");
            }
          }}
        />
      )}
      {copany.telegram_url && (
        <Image
          src={TelegramIcon}
          alt={copany.telegram_url || ""}
          className={`${sizeClasses[size]} cursor-pointer`}
          width={iconWidth}
          height={iconHeight}
          placeholder="blur"
          blurDataURL={shimmerDataUrlWithTheme(
            iconWidth,
            iconHeight,
            isDarkMode
          )}
          onClick={() => {
            if (copany.telegram_url) {
              window.open(copany.telegram_url, "_blank");
            }
          }}
        />
      )}
      {copany.notion_url && (
        <Image
          src={currentNotionIcon}
          alt={copany.notion_url || ""}
          className={`${sizeClasses[size]} cursor-pointer`}
          width={iconWidth}
          height={iconHeight}
          placeholder="blur"
          blurDataURL={shimmerDataUrlWithTheme(
            iconWidth,
            iconHeight,
            isDarkMode
          )}
          onClick={() => {
            if (copany.notion_url) {
              window.open(copany.notion_url, "_blank");
            }
          }}
        />
      )}
      {copany.figma_url && (
        <Image
          src={FigmaIcon}
          alt={copany.figma_url || ""}
          className={`${sizeClasses[size]} cursor-pointer`}
          width={iconWidth}
          height={iconHeight}
          placeholder="blur"
          blurDataURL={shimmerDataUrlWithTheme(
            iconWidth,
            iconHeight,
            isDarkMode
          )}
          onClick={() => {
            if (copany.figma_url) {
              window.open(copany.figma_url, "_blank");
            }
          }}
        />
      )}
      {copany.github_url && (
        <Image
          src={currentGithubIcon}
          alt={copany.github_url || ""}
          className={`${sizeClasses[size]} cursor-pointer`}
          width={iconWidth}
          height={iconHeight}
          placeholder="blur"
          blurDataURL={shimmerDataUrlWithTheme(
            iconWidth,
            iconHeight,
            isDarkMode
          )}
          onClick={() => {
            if (copany.github_url) {
              window.open(copany.github_url, "_blank");
            }
          }}
        />
      )}
    </div>
  );
}
