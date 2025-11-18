"use client";

import { Copany } from "@/types/database.types";
import SecondaryTabViewView from "@/components/commons/SecondaryTabView";
import ReadmeView from "./ReadmeView";
import LicenseView from "./LicenseView";
import ContributingView from "./ContributingView";
import CopanyRightPanel from "@/components/copany/CopanyRightPanel";
import CopanyHeader from "@/components/copany/CopanyHeader";

interface AboutViewProps {
  copany: Copany;
}

export default function AboutView({ copany }: AboutViewProps) {
  const tabs = [
    {
      label: "Readme",
      content: <ReadmeView githubUrl={copany.github_url} />,
    },
    {
      label: "License",
      content: <LicenseView githubUrl={copany.github_url} copany={copany} />,
    },
    {
      label: "Contributing",
      content: <ContributingView githubUrl={copany.github_url} />,
    },
  ];

  return (
    <div className="flex flex-col gap-4 px-4">
      <CopanyHeader
        copany={copany}
        showCoverImage={false}
        showDescription={false}
      />
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <SecondaryTabViewView tabs={tabs} urlParamName="aboutSubTab" />
        </div>
        <div className="w-full lg:w-[340px] xl:w-[360px] flex-shrink-0">
          <CopanyRightPanel copanyId={copany.id} copany={copany} />
        </div>
      </div>
    </div>
  );
}
