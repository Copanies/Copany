"use client";

import SecondaryTabView from "@/components/commons/SecondaryTabView";
import FinanceView from "./FinanceView";
import OverviewView from "./OverviewView";
import CopanyHeader from "@/components/copany/CopanyHeader";
import { Copany } from "@/types/database.types";
import DistributeView from "./DistributeView";
import { useTranslations } from "next-intl";

export default function DistributeFinanceView({ copany }: { copany: Copany }) {
  const t = useTranslations("secondaryTabs");
  const tabs = [
    {
      key: "overview",
      label: t("overview"),
      content: <OverviewView copanyId={copany.id} />,
    },
    {
      key: "distribute",
      label: t("distribute"),
      content: <DistributeView copanyId={copany.id} />,
    },
    {
      key: "finance",
      label: t("finance"),
      content: <FinanceView copanyId={copany.id} />,
    },
  ];
  return (
    <div className="min-h-screen w-full min-w-0 flex flex-col gap-4 px-4">
      <CopanyHeader copany={copany} showCoverImage={false} />
      <div className="flex flex-col gap-6">
        <div className="flex-1 min-w-0">
          <SecondaryTabView tabs={tabs} urlParamName="distributeFinanceTab" />
        </div>
      </div>
    </div>
  );
}
