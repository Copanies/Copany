"use client";

import { useCopany } from "@/hooks/copany";
import { useCurrentUser } from "@/hooks/currentUser";
import TabView from "@/components/commons/TabView";
import ReadmeView from "./subviews/ReadmeView";
import LicenseView from "./subviews/LicenseView";
import Image from "next/image";
import LoadingView from "@/components/commons/LoadingView";
import CooperateView from "./subviews/CooperateView";
import ContributionView from "./subviews/ContributionView";
import SettingsView from "./subviews/settings/SettingsView";
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

  // 使用 React Query hooks 替代 cacheManager
  const { data: copany, isLoading: isCopanyLoading } = useCopany(copanyId);
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();

  const isLoading = isCopanyLoading || isUserLoading;

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
          onCopanyUpdate={(_updatedCopany) => {
            // 这里可以通过 React Query 的 setQueryData 来更新缓存
            // 或者让 LicenseView 内部处理数据更新
          }}
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
              <SettingsView
                copany={copany}
                onCopanyUpdate={(_updatedCopany) => {
                  // 这里可以通过 React Query 的 setQueryData 来更新缓存
                  // 或者让 SettingsView 内部处理数据更新
                }}
              />
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
