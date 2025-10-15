"use client";

import ContributionOverviewView from "./ContributionOverviewView";
import HowToContributionView from "./HowToContributionView";
import ContributionRecordsView from "./ContributionRecordsView";
import SecondaryTabViewView from "@/components/commons/SecondaryTabView";

export default function ContributionView({ copanyId }: { copanyId: string }) {
  const tabs = [
    {
      label: "Overview",
      content: <ContributionOverviewView copanyId={copanyId} />,
    },
    {
      label: "Records",
      content: <ContributionRecordsView copanyId={copanyId} />,
    },
    {
      label: "How to contribution",
      content: <HowToContributionView copanyId={copanyId} />,
    },
  ];
  return <SecondaryTabViewView tabs={tabs} urlParamName="contributionTab" />;
}
