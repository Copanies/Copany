"use client";

import { Suspense } from "react";
import { useCopany } from "@/hooks/copany";
import { useCurrentUser } from "@/hooks/currentUser";
import TabView from "@/components/commons/TabView";
import AboutView from "./_subTabs/about/AboutView";
import LoadingView from "@/components/commons/LoadingView";
import WorksView from "./_subTabs/works/WorksView";
import ContributionView from "./_subTabs/contribution/ContributionView";
import FinanceView from "./_subTabs/finance/FinanceView";
import SettingsView from "./_subTabs/settings/SettingsView";
import DiscussionView from "./_subTabs/discussion/DiscussionView";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpenIcon,
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
  console.log(`[CopanyView] 🚀 Component initialized:`, {
    copanyId,
  });

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
    ...(copany.github_url
      ? [
          {
            label: "About",
            icon: <BookOpenIcon strokeWidth={2} className="w-4 h-4" />,
            content: <AboutView copany={copany} />,
          },
        ]
      : []),
    ...(copany.github_url
      ? [
          {
            label: "Works",
            icon: <UserGroupIcon strokeWidth={2} className="w-4 h-4" />,
            content: <WorksView copanyId={copanyId} />,
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
            label: "Works",
            icon: <UserGroupIcon strokeWidth={2} className="w-4 h-4" />,
            content: <WorksView copanyId={copanyId} />,
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
    <div className="gap-2 flex flex-col h-full relative mb-8">
      <Suspense fallback={<LoadingView type="label" label="Loading tabs..." />}>
        <TabView tabs={tabs} />
      </Suspense>
    </div>
  );
}
