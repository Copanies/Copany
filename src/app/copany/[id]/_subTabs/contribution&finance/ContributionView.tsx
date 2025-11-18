"use client";

import ContributionOverviewView from "./ContributionOverviewView";
import HowToContributionView from "../about/ContributingView";
import ContributionRecordsView from "./ContributionRecordsView";
import SecondaryTabViewView from "@/components/commons/SecondaryTabView";
import { Copany } from "@/types/database.types";

export default function ContributionView({ copany }: { copany: Copany }) {
  const tabs = [
    {
      label: "Overview",
      content: <ContributionOverviewView copanyId={copany.id} />,
    },
    {
      label: "Records",
      content: <ContributionRecordsView copanyId={copany.id} />,
    },
    {
      label: "How to contribution",
      content: <HowToContributionView githubUrl={copany.github_url} />,
    },
  ];
  return <SecondaryTabViewView tabs={tabs} urlParamName="contributionTab" />;
}
