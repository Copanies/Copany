"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Copany } from "@/types/database.types";
import { getCopanyByIdAction } from "@/actions/copany.actions";
import { currentUserManager, copanyManager } from "@/utils/cache";
import TabView from "@/components/commons/TabView";
import ReadmeView from "./subviews/ReadmeView";
import LicenseView from "./subviews/LicenseView";
import Image from "next/image";
import LoadingView from "@/components/commons/LoadingView";
import CooperateView from "./subviews/CooperateView";
import ContributionView from "./subviews/ContributionView";
import SettingsView from "./subviews/settings/SettingsView";
import { User } from "@supabase/supabase-js";
import AssetLinksSection from "@/components/AssetLinksSection";
import LicenseBadge from "@/components/commons/LicenseBadge";

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialLoadRef = useRef(false);

  // 统一改为使用默认 copanyManager，并依赖全局事件联动 UI

  // Use new SWR strategy to load data
  const loadCopany = useCallback(async () => {
    if (hasInitialLoadRef.current) return;
    hasInitialLoadRef.current = true;

    try {
      console.log(
        `[CopanyDetailClient] 🔄 Loading copany with SWR strategy...`
      );
      setIsLoading(true);

      // Load copany data and current user information in parallel
      const [copanyData, userData] = await Promise.all([
        copanyManager.getCopany(copanyId, async () => {
          const result = await getCopanyByIdAction(copanyId);
          if (!result) {
            throw new Error("Copany not found");
          }
          return result;
        }),
        currentUserManager.getCurrentUser(),
      ]);

      console.log(`[CopanyDetailClient] ✅ Loaded copany:`, copanyData);
      console.log(`[CopanyDetailClient] ✅ Loaded user:`, userData?.email);

      setCopany(copanyData);
      setCurrentUser(userData);
    } catch (error) {
      console.error("[CopanyDetailClient] ❌ Error loading copany:", error);
    } finally {
      setIsLoading(false);
    }
  }, [copanyId]);

  useEffect(() => {
    loadCopany();
  }, [loadCopany]);

  // 订阅全局 cache:updated，以便接收默认 copanyManager 的更新（例如其他组件 setCopany）
  useEffect(() => {
    const onCacheUpdated = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as {
          manager: string;
          key: string;
          data: unknown;
        };
        if (!detail) return;
        if (
          detail.manager === "CopanyManager" &&
          String(detail.key) === String(copanyId)
        ) {
          setCopany((detail.data as Copany) || null);
        }
      } catch (_) {}
    };
    if (typeof window !== "undefined") {
      window.addEventListener("cache:updated", onCacheUpdated as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "cache:updated",
          onCacheUpdated as EventListener
        );
      }
    };
  }, [copanyId]);

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

  // Check if the current user is the copany creator
  const isCreator = currentUser && currentUser.id === copany.created_by;

  // Build tabs array, only include Settings tab if user is creator
  const tabs = [
    {
      label: "README",
      content: <ReadmeView githubUrl={copany.github_url} />,
    },
    {
      label: "License",
      content: (
        <LicenseView
          githubUrl={copany.github_url}
          copany={copany}
          onCopanyUpdate={setCopany}
        />
      ),
    },
    {
      label: "Cooperate",
      content: <CooperateView copanyId={copanyId} />,
    },
    {
      label: "Contribution",
      content: <ContributionView copanyId={copanyId} />,
    },
    ...(isCreator
      ? [
          {
            label: "Settings",
            content: (
              <SettingsView copany={copany} onCopanyUpdate={setCopany} />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="p-6 max-w-screen-lg mx-auto gap-4 flex flex-col h-full relative">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex flex-row gap-3 items-center">
            <Image
              src={copany.logo_url || ""}
              alt={copany.name || ""}
              width={40}
              height={40}
              className="rounded-md"
            />
            <h1 className="text-2xl font-bold">{copany.name}</h1>
            <div className="hidden sm:block">
              {copany.license && <LicenseBadge license={copany.license} />}
            </div>
          </div>
          <div className="flex flex-row justify-between flex-wrap items-center gap-3">
            {copany.license && (
              <div className="block sm:hidden">
                <LicenseBadge license={copany.license} />
              </div>
            )}
            <AssetLinksSection copany={copany} />
          </div>
        </div>
        <p className="">{copany.description}</p>
      </div>
      <TabView tabs={tabs} />
    </div>
  );
}
