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
import FinanceView from "./subviews/finance/FinanceView";
import SettingsView from "./subviews/settings/SettingsView";
import AssetLinksSection from "@/components/AssetLinksSection";
import LicenseBadge from "@/components/commons/LicenseBadge";
import { EMPTY_STRING } from "@/utils/constants";
import { useQueryClient } from "@tanstack/react-query";
import StarButton from "@/components/StarButton";
import {
  BookOpenIcon,
  ScaleIcon,
  UserGroupIcon,
  ChartPieIcon,
  ReceiptPercentIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

interface CopanyViewProps {
  copanyId: string;
}

export default function CopanyView({ copanyId }: CopanyViewProps) {
  console.log(`[CopanyView] 🚀 Component initialized:`, {
    copanyId,
  });

  // 使用 React Query hooks 替代 cacheManager
  const { data: copany, isLoading: isCopanyLoading } = useCopany(copanyId);
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const queryClient = useQueryClient();

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
      icon: <BookOpenIcon strokeWidth={2} className="w-4 h-4" />,
      content: <ReadmeView githubUrl={copany.github_url} />,
    },
    {
      label: "LICENSE",
      icon: <ScaleIcon strokeWidth={2} className="w-4 h-4" />,
      content: <LicenseView githubUrl={copany.github_url} copany={copany} />,
    },
    {
      label: "Cooperate",
      icon: <UserGroupIcon strokeWidth={2} className="w-4 h-4" />,
      content: <CooperateView copanyId={copanyId} />,
    },
    {
      label: "Contribution",
      icon: <ChartPieIcon strokeWidth={2} className="w-4 h-4" />,
      content: <ContributionView copanyId={copanyId} />,
    },
    {
      label: "Finance",
      icon: <ReceiptPercentIcon strokeWidth={2} className="w-4 h-4" />,
      content: <FinanceView copanyId={copanyId} />,
    },
    ...(isCreator
      ? [
          {
            label: "Settings",
            icon: <Cog6ToothIcon strokeWidth={2} className="w-4 h-4" />,
            content: (
              <SettingsView
                copany={copany}
                onCopanyUpdate={(updatedCopany) => {
                  // 更新 React Query 缓存以保持 UI 同步
                  queryClient.setQueryData(["copany", copanyId], updatedCopany);
                  queryClient.invalidateQueries({
                    queryKey: ["copany", copanyId],
                  });
                  queryClient.invalidateQueries({ queryKey: ["copanies"] });
                }}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="max-w-screen-lg mx-auto gap-4 flex flex-col h-full relative mb-8">
      <div className="flex flex-col gap-4 px-5 pt-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex flex-row gap-3 items-center">
            <Image
              src={copany.logo_url || EMPTY_STRING}
              alt={copany.name || EMPTY_STRING}
              width={40}
              height={40}
              className="rounded-md"
            />
            <h1 className="text-2xl font-bold">{copany.name}</h1>
            <div className="hidden sm:block">
              {copany.license && <LicenseBadge license={copany.license} />}
            </div>
            <div className="block sm:hidden flex flex-1 justify-end">
              <StarButton copanyId={copanyId} size="md" />
            </div>
          </div>
          <div className="flex flex-row justify-between flex-wrap items-center gap-3 gap-y-4">
            {copany.license && (
              <div className="block sm:hidden">
                <LicenseBadge license={copany.license} />
              </div>
            )}
            <AssetLinksSection copany={copany} />
            <div className="hidden sm:block">
              <StarButton copanyId={copanyId} size="md" />
            </div>
          </div>
        </div>
        <p className="">{copany.description}</p>
      </div>
      <TabView tabs={tabs} />
    </div>
  );
}
