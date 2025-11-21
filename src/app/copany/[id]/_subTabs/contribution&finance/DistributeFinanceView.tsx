"use client";

import SecondaryTabViewView from "@/components/commons/SecondaryTabView";
import FinanceView from "./FinanceView";
import OverviewView from "./OverviewView";
import CopanyHeader from "@/components/copany/CopanyHeader";
import { Copany } from "@/types/database.types";
import DistributeView from "./DistributeView";

export default function DistributeFinanceView({ copany }: { copany: Copany }) {
  const tabs = [
    {
      label: "Overview",
      content: <OverviewView copanyId={copany.id} />,
    },
    {
      label: "Distribute",
      content: <DistributeView copanyId={copany.id} />,
    },
    {
      label: "Finance",
      content: <FinanceView copanyId={copany.id} />,
    },
  ];
  return (
    <div className="min-h-screen w-full min-w-0 flex flex-col gap-4 px-4">
      <CopanyHeader copany={copany} showCoverImage={false} />
      <div className="flex flex-col gap-6">
        <div className="flex-1 min-w-0">
          <SecondaryTabViewView
            tabs={tabs}
            urlParamName="distributeFinanceTab"
          />
        </div>
      </div>
    </div>
  );
}
