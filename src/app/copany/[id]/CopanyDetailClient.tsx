"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Copany } from "@/types/database.types";
import { getCopanyByIdAction } from "@/actions/copany.actions";
import { copanyManager } from "@/utils/cache";
import { useDarkMode } from "@/utils/useDarkMode";
import TabView from "@/components/commons/TabView";
import ReadmeView from "./subviews/ReadmeView";
import Image from "next/image";
import LoadingView from "@/components/commons/LoadingView";
import CooperateView from "./subviews/CooperateView";
import ContributionView from "./subviews/ContributionView";
import GithubIcon from "@/assets/github_logo.svg";
import GithubDarkIcon from "@/assets/github_logo_dark.svg";
import FigmaIcon from "@/assets/figma_logo.svg";
import TelegramIcon from "@/assets/telegram_logo.svg";
import DiscordIcon from "@/assets/discord_logo.svg";
import DiscordDarkIcon from "@/assets/discord_logo_dark.svg";
import NotionIcon from "@/assets/notion_logo.svg";
import NotionDarkIcon from "@/assets/notion_logo_dark.png";
import SettingsView from "./subviews/settings/SettingsView";

interface CopanyDetailClientProps {
  copanyId: string;
}

export default function CopanyDetailClient({
  copanyId,
}: CopanyDetailClientProps) {
  console.log(`[CopanyDetailClient] 🚀 Component initialized:`, {
    copanyId,
  });

  const [copany, setCopany] = useState<Copany | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialLoadRef = useRef(false);

  // 使用自定义 hook 检测 dark mode
  const isDarkMode = useDarkMode();

  // 使用新的 SWR 策略加载数据
  const loadCopany = useCallback(async () => {
    if (hasInitialLoadRef.current) return;
    hasInitialLoadRef.current = true;

    try {
      console.log(
        `[CopanyDetailClient] 🔄 Loading copany with SWR strategy...`
      );
      setIsLoading(true);

      // 使用 SWR 策略：立即返回缓存 + 后台更新
      const data = await copanyManager.getCopany(copanyId, async () => {
        const result = await getCopanyByIdAction(copanyId);
        if (!result) {
          throw new Error("Copany not found");
        }
        return result;
      });

      console.log(`[CopanyDetailClient] ✅ Loaded copany:`, data?.name);
      setCopany(data);
    } catch (error) {
      console.error("[CopanyDetailClient] ❌ Error loading copany:", error);
    } finally {
      setIsLoading(false);
    }
  }, [copanyId]);

  useEffect(() => {
    loadCopany();
  }, [loadCopany]);

  if (isLoading) {
    return (
      <div className="p-8 max-w-screen-lg mx-auto">
        <LoadingView type="page" />
      </div>
    );
  }

  if (!copany) {
    return (
      <div className="p-8 max-w-screen-lg mx-auto">
        <div className="text-center text-gray-500">Copany not found</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-screen-lg mx-auto gap-4 flex flex-col h-full relative">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex flex-row gap-3 items-center">
            <Image
              src={copany.organization_avatar_url || ""}
              alt={copany.name || ""}
              width={40}
              height={40}
              className="border-1 border-gray-300 dark:border-gray-700"
            />
            <h1 className="text-2xl font-bold">{copany.name}</h1>
          </div>
          <div className="flex flex-row gap-3 items-center">
            {copany.discord_url && (
              <Image
                src={isDarkMode ? DiscordDarkIcon : DiscordIcon}
                alt={copany.discord_url || ""}
                className="w-5 h-5 cursor-pointer"
                onClick={() => {
                  window.open(copany.discord_url, "_blank");
                }}
              />
            )}
            {copany.telegram_url && (
              <Image
                src={TelegramIcon}
                alt={copany.telegram_url || ""}
                className="w-5 h-5 cursor-pointer"
                onClick={() => {
                  window.open(copany.telegram_url, "_blank");
                }}
              />
            )}
            {copany.notion_url && (
              <Image
                src={isDarkMode ? NotionDarkIcon : NotionIcon}
                alt={copany.notion_url || ""}
                className="w-5 h-5 cursor-pointer"
                onClick={() => {
                  window.open(copany.notion_url, "_blank");
                }}
              />
            )}
            {copany.figma_url && (
              <Image
                src={FigmaIcon}
                alt={copany.figma_url || ""}
                className="w-5 h-5 cursor-pointer"
                onClick={() => {
                  window.open(copany.figma_url, "_blank");
                }}
              />
            )}
            {copany.github_url && (
              <Image
                src={isDarkMode ? GithubDarkIcon : GithubIcon}
                alt={copany.github_url || ""}
                className="w-5 h-5 cursor-pointer"
                onClick={() => {
                  window.open(copany.github_url, "_blank");
                }}
              />
            )}
          </div>
        </div>
        <p className="">{copany.description}</p>
      </div>
      <TabView
        tabs={[
          {
            label: "README",
            content: <ReadmeView githubUrl={copany.github_url} />,
          },
          {
            label: "Cooperate",
            content: <CooperateView copanyId={copanyId} />,
          },
          {
            label: "Contribution",
            content: <ContributionView copanyId={copanyId} />,
          },
          {
            label: "Settings",
            content: <SettingsView copany={copany} />,
          },
        ]}
      />
    </div>
  );
}
