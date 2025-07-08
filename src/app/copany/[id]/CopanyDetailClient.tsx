"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Copany } from "@/types/database.types";
import { getCopanyByIdAction } from "@/actions/copany.actions";
import { copanyDataManager } from "@/utils/cache";
import TabView from "@/components/commons/TabView";
import ReadmeView from "./subviews/ReadmeView";
import Image from "next/image";
import LoadingView from "@/components/commons/LoadingView";
import CooperateView from "./subviews/CooperateView";
import ContributionView from "./subviews/ContributionView";

interface CopanyDetailClientProps {
  copanyId: string;
}

export default function CopanyDetailClient({
  copanyId,
}: CopanyDetailClientProps) {
  console.log(`[CopanyDetailClient] 🚀 Component initialized:`, {
    copanyId,
  });

  const [copany, setCopany] = useState<Copany | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialLoadRef = useRef(false);

  // 使用新的 SWR 策略加载数据
  const loadCopany = useCallback(async () => {
    if (hasInitialLoadRef.current) return;
    hasInitialLoadRef.current = true;

    try {
      console.log(
        `[CopanyDetailClient] 🔄 Loading copany with SWR strategy...`
      );
      setIsLoading(true);

      // 使用 SWR 策略：立即返回缓存 + 后台更新
      const data = await copanyDataManager.getData(copanyId, async () => {
        const result = await getCopanyByIdAction(copanyId);
        if (!result) {
          throw new Error("Copany not found");
        }
        return result;
      });

      console.log(`[CopanyDetailClient] ✅ Loaded copany:`, data?.name);
      setCopany(data);
    } catch (error) {
      console.error("[CopanyDetailClient] ❌ Error loading copany:", error);
    } finally {
      setIsLoading(false);
    }
  }, [copanyId]);

  useEffect(() => {
    loadCopany();
  }, [loadCopany]);

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

  return (
    <div className="p-8 max-w-screen-lg mx-auto gap-4 flex flex-col h-full relative">
      <div className="flex flex-col gap-1">
        <Image
          src={copany.organization_avatar_url || ""}
          alt={copany.name || ""}
          width={100}
          height={100}
          className="border-1 border-gray-300 dark:border-gray-700"
        />
        <h1 className="text-2xl font-bold">{copany.name}</h1>
        <p className="">{copany.description}</p>
        <a
          href={copany.github_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {copany.github_url}
        </a>
      </div>
      <TabView
        tabs={[
          {
            label: "README",
            content: <ReadmeView githubUrl={copany.github_url} />,
          },
          {
            label: "Cooperate",
            content: <CooperateView copanyId={copanyId} />,
          },
          {
            label: "Contribution",
            content: <ContributionView copanyId={copanyId} />,
          },
        ]}
      />
    </div>
  );
}
