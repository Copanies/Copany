"use client";

import { Suspense } from "react";
import { useCopany } from "@/hooks/copany";
import { useCurrentUser } from "@/hooks/currentUser";
import { Copany } from "@/types/database.types";
import TabView from "@/components/commons/TabView";
import ReadmeView from "./_subTabs/readme/ReadmeView";
import LicenseView from "./_subTabs/license/LicenseView";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import LoadingView from "@/components/commons/LoadingView";
import CooperateView from "./_subTabs/issue/CooperateView";
import ContributionView from "./_subTabs/contribution/ContributionView";
import FinanceView from "./_subTabs/finance/FinanceView";
import SettingsView from "./_subTabs/settings/SettingsView";
import DiscussionView from "./_subTabs/discussion/DiscussionView";
import AssetLinksSection from "@/components/copany/AssetLinksSection";
import LicenseBadge from "@/components/copany/LicenseBadge";
import { EMPTY_STRING } from "@/utils/constants";
import { useQueryClient } from "@tanstack/react-query";
import StarButton from "@/components/copany/StarButton";
import AssetLinkModal from "./_subTabs/settings/AssetLinkModal";
import { useState } from "react";
import GithubIcon from "@/assets/github_logo.svg";
import GithubDarkIcon from "@/assets/github_logo_dark.svg";
import {
  BookOpenIcon,
  ScaleIcon,
  UserGroupIcon,
  ChartPieIcon,
  ReceiptPercentIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

interface CopanyViewProps {
  copanyId: string;
}

export default function CopanyView({ copanyId }: CopanyViewProps) {
  const isDarkMode = useDarkMode();
  const [isConnectRepoModalOpen, setIsConnectRepoModalOpen] = useState(false);
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

  // Handle connect repo button click
  const handleConnectRepo = () => {
    setIsConnectRepoModalOpen(true);
  };

  // Handle copany update from modal
  const handleCopanyUpdate = (updatedCopany: Copany) => {
    // 更新 React Query 缓存以保持 UI 同步
    queryClient.setQueryData(["copany", copanyId], updatedCopany);
    queryClient.invalidateQueries({
      queryKey: ["copany", copanyId],
    });
    queryClient.invalidateQueries({ queryKey: ["copanies"] });
  };

  // Build tabs array, only include Settings tab if user is creator
  const tabs = [
    ...(copany.github_url
      ? [
          {
            label: "README",
            icon: <BookOpenIcon strokeWidth={2} className="w-4 h-4" />,
            content: <ReadmeView githubUrl={copany.github_url} />,
          },
        ]
      : []),
    ...(copany.github_url
      ? [
          {
            label: "Cooperate",
            icon: <UserGroupIcon strokeWidth={2} className="w-4 h-4" />,
            content: <CooperateView copanyId={copanyId} />,
          },
          {
            label: "Discussion",
            icon: (
              <ChatBubbleLeftRightIcon strokeWidth={2} className="w-4 h-4" />
            ),
            content: <DiscussionView copanyId={copanyId} />,
          },
        ]
      : [
          {
            label: "Discussion",
            icon: (
              <ChatBubbleLeftRightIcon strokeWidth={2} className="w-4 h-4" />
            ),
            content: <DiscussionView copanyId={copanyId} />,
          },
          {
            label: "Cooperate",
            icon: <UserGroupIcon strokeWidth={2} className="w-4 h-4" />,
            content: <CooperateView copanyId={copanyId} />,
          },
        ]),
    {
      label: "Contribution",
      icon: <ChartPieIcon strokeWidth={2} className="w-4 h-4" />,
      content: <ContributionView copany={copany} />,
    },
    {
      label: "Finance",
      icon: <ReceiptPercentIcon strokeWidth={2} className="w-4 h-4" />,
      content: <FinanceView copanyId={copanyId} />,
    },
    {
      label: "LICENSE",
      icon: <ScaleIcon strokeWidth={2} className="w-4 h-4" />,
      content: <LicenseView githubUrl={copany.github_url} copany={copany} />,
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
    <div className="max-w-screen-lg mx-auto gap-2 flex flex-col h-full relative mb-8">
      <div
        className={`flex flex-col gap-4 px-5 ${
          copany.cover_image_url ? "pt-0" : "pt-6"
        }`}
      >
        {/* Cover image section */}
        {copany.cover_image_url && (
          <div className="relative w-full aspect-[5]">
            <Image
              src={copany.cover_image_url}
              alt={`${copany.name} cover image`}
              fill
              className="object-cover w-full h-full"
              style={{ objectPosition: "center" }}
              sizes="100vw"
              priority
              placeholder="blur"
              blurDataURL={shimmerDataUrlWithTheme(400, 400, isDarkMode)}
            />
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex flex-row gap-3 items-center">
            {copany.logo_url && (
              <Image
                src={copany.logo_url || EMPTY_STRING}
                alt={copany.name || EMPTY_STRING}
                width={64}
                height={64}
                className="rounded-md"
                placeholder="blur"
                blurDataURL={shimmerDataUrlWithTheme(64, 64, isDarkMode)}
              />
            )}
            <h1 className="text-2xl font-bold">{copany.name}</h1>
            <div className="hidden sm:block">
              <LicenseBadge
                license={copany.license}
                isDefaultUseCOSL={copany.isDefaultUseCOSL}
                copanyId={copany.id}
              />
            </div>
            <div className="block sm:hidden flex flex-1 justify-end">
              <StarButton
                copanyId={copanyId}
                size="md"
                count={copany.star_count}
              />
            </div>
          </div>
          <div className="flex flex-row justify-between flex-wrap items-center gap-3 gap-y-4">
            <div className="block sm:hidden">
              <LicenseBadge
                license={copany.license}
                isDefaultUseCOSL={copany.isDefaultUseCOSL}
                copanyId={copany.id}
              />
            </div>
            <AssetLinksSection
              copany={copany}
              onConnectRepo={handleConnectRepo}
            />
            <div className="hidden sm:block">
              <StarButton
                copanyId={copanyId}
                size="md"
                count={copany.star_count}
              />
            </div>
          </div>
        </div>
        <p className="">{copany.description}</p>
      </div>
      <Suspense fallback={<LoadingView type="label" label="Loading tabs..." />}>
        <TabView tabs={tabs} />
      </Suspense>

      {/* Connect Repo Modal */}
      <AssetLinkModal
        isOpen={isConnectRepoModalOpen}
        onClose={() => setIsConnectRepoModalOpen(false)}
        assetLinks={[
          {
            label: "Github",
            key: "github_url",
            value: copany.github_url,
            icon: GithubIcon,
            darkIcon: GithubDarkIcon,
            id: 1,
          },
        ]}
        copany={copany}
        onCopanyUpdate={handleCopanyUpdate}
        forceGithubType={true}
      />
    </div>
  );
}
