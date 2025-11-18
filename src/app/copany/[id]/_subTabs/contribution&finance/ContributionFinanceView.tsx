"use client";

import SecondaryTabViewView from "@/components/commons/SecondaryTabView";
import TransactionsView from "./TransactionsView";
import ContributionOverviewView from "./ContributionOverviewView";
import CopanyHeader from "@/components/copany/CopanyHeader";
import { Copany } from "@/types/database.types";

export default function ContributionFinanceView({
  copany,
}: {
  copany: Copany;
}) {
  const tabs = [
    {
      label: "Overview",
      content: <ContributionOverviewView copanyId={copany.id} />,
    },
    {
      label: "Finance",
      content: <TransactionsView copanyId={copany.id} />,
    },
  ];
  return (
    <div className="min-h-screen w-full min-w-0 flex flex-col gap-4 px-4">
      <CopanyHeader
        copany={copany}
        showCoverImage={false}
        showDescription={false}
      />
      <div className="flex flex-col gap-6">
        <div className="flex-1 min-w-0">
          <SecondaryTabViewView
            tabs={tabs}
            urlParamName="contributionFinanceTab"
          />
        </div>
      </div>
    </div>
  );
}
