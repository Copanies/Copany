"use client";

import IssuesView from "./IssuesView";
import DiscussionView from "./DiscussionView";
import SecondaryTabView from "@/components/commons/SecondaryTabView";
import CopanyHeader from "@/components/copany/CopanyHeader";
import CopanyRightPanel from "@/components/copany/CopanyRightPanel";
import { Copany } from "@/types/database.types";
import { useTranslations } from "next-intl";

export default function WorksView({ copany }: { copany: Copany }) {
  const t = useTranslations("secondaryTabs");
  const tabs = [
    {
      key: "issues",
      label: t("issues"),
      content: <IssuesView copanyId={copany.id} />,
    },
    {
      key: "discussion",
      label: t("discussion"),
      content: <DiscussionView copanyId={copany.id} />,
    },
  ];
  return (
    <div className="min-h-screen w-full min-w-0 flex flex-col gap-4 px-4">
      <CopanyHeader copany={copany} showCoverImage={false} />
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <SecondaryTabView tabs={tabs} urlParamName="worksTab" />
        </div>
        <div className="w-full lg:w-[340px] xl:w-[360px] flex-shrink-0">
          <CopanyRightPanel
            copanyId={copany.id}
            copany={copany}
            showAbout={true}
            showIssues={true}
            showDiscussions={true}
            showContributions={true}
          />
        </div>
      </div>
    </div>
  );
}
