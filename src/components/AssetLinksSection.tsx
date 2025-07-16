import { Copany } from "@/types/database.types";
import Image from "next/image";
import { useDarkMode } from "@/utils/useDarkMode";
import GithubIcon from "@/assets/github_logo.svg";
import GithubDarkIcon from "@/assets/github_logo_dark.svg";
import FigmaIcon from "@/assets/figma_logo.svg";
import TelegramIcon from "@/assets/telegram_logo.svg";
import DiscordIcon from "@/assets/discord_logo.svg";
import DiscordDarkIcon from "@/assets/discord_logo_dark.svg";
import NotionIcon from "@/assets/notion_logo.png";
import NotionDarkIcon from "@/assets/notion_logo_dark.png";
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

  // 在客户端挂载前使用亮色主题图标
  const currentGithubIcon = mounted && isDarkMode ? GithubDarkIcon : GithubIcon;
  const currentDiscordIcon =
    mounted && isDarkMode ? DiscordDarkIcon : DiscordIcon;
  const currentNotionIcon = mounted && isDarkMode ? NotionDarkIcon : NotionIcon;

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
      {copany.discord_url && (
        <Image
          src={currentDiscordIcon}
          alt={copany.discord_url || ""}
          className={`${sizeClasses[size]} cursor-pointer`}
          width={iconWidth}
          height={iconHeight}
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
