"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Copany } from "@/types/database.types";
import { getCopanyByIdAction } from "@/actions/copany.actions";
import { copanyCache } from "@/utils/cache";
import TabView from "@/components/commons/TabView";
import ReadmeView from "./subviews/ReadmeView";
import Image from "next/image";
import LoadingView from "@/components/commons/LoadingView";
import CooperateView from "./subviews/CooperateView";

interface CopanyDetailClientProps {
  copanyId: string;
}

export default function CopanyDetailClient({
  copanyId,
}: CopanyDetailClientProps) {
  console.log(`[CopanyDetailClient] 🚀 Component initialized:`, {
    copanyId,
  });

  // 初始时使用服务端数据
  const [copany, setCopany] = useState<Copany | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const hasLoadedRef = useRef(false);
  const hasMountedRef = useRef(false);

  const loadCopany = useCallback(async () => {
    try {
      console.log(`[CopanyDetailClient] 🌐 Loading copany from server...`);
      setIsInitialLoad(true);
      const data = await getCopanyByIdAction(copanyId);
      console.log(`[CopanyDetailClient] ✅ Loaded from server:`, data?.name);
      setCopany(data);
      // 更新缓存
      if (data) {
        copanyCache.set(copanyId, data);
      }
    } catch (error) {
      console.error("[CopanyDetailClient] ❌ Error loading copany:", error);
    } finally {
      setIsInitialLoad(false);
    }
  }, [copanyId]);

  const silentRefresh = useCallback(async () => {
    try {
      console.log(`[CopanyDetailClient] 🔄 Silent refresh started...`);
      const data = await getCopanyByIdAction(copanyId);
      console.log(
        `[CopanyDetailClient] ✅ Silent refresh completed:`,
        data?.name
      );
      setCopany(data);
      // 更新缓存
      if (data) {
        copanyCache.set(copanyId, data);
      }
    } catch (error) {
      console.error("[CopanyDetailClient] ❌ Error refreshing copany:", error);
    }
  }, [copanyId]);

  // 客户端挂载后检查缓存
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      console.log(`[CopanyDetailClient] 📱 Client mounted, checking cache...`);

      // 尝试从缓存读取数据
      const cachedData = copanyCache.get(copanyId);
      if (cachedData && !copany) {
        console.log(
          `[CopanyDetailClient] 💾 Using cached data:`,
          cachedData.name
        );
        setCopany(cachedData);
        setIsInitialLoad(false);
      } else if (cachedData && copany) {
        console.log(
          `[CopanyDetailClient] 📊 Already have data, skipping cache`
        );
      } else {
        console.log(`[CopanyDetailClient] 🚫 No cache available`);
      }
    }
  }, [copanyId, copany]);

  useEffect(() => {
    // 如果有缓存或初始数据，静默刷新
    if (copany && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      console.log(`[CopanyDetailClient] 🔄 Scheduling silent refresh...`);
      // 延迟一点执行静默刷新，让页面先渲染
      setTimeout(() => {
        silentRefresh();
      }, 100);
    }
    // 如果没有数据，正常加载
    else if (!copany && hasMountedRef.current) {
      console.log(
        `[CopanyDetailClient] 📥 No data available, loading from server...`
      );
      loadCopany();
    }
  }, [copanyId, copany, loadCopany, silentRefresh]);

  if (isInitialLoad) {
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
        ]}
      />
    </div>
  );
}
