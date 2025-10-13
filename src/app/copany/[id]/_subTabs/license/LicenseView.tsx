"use client";

import { Suspense } from "react";
import { useState, useEffect, useRef } from "react";
import { useCurrentUser } from "@/hooks/currentUser";
import { useRepoLicense } from "@/hooks/readme";
import { updateCopanyLicenseAction } from "@/actions/copany.actions";
import LoadingView from "@/components/commons/LoadingView";
import { ScaleIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { Copany } from "@/types/database.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EMPTY_STRING } from "@/utils/constants";
import { useRouter } from "next/navigation";
import CoslLicenseTip from "@/components/copany/CoslLicenseTip";
import { generateCOSLLicense } from "@/utils/coslLicense";

interface LicenseViewProps {
  githubUrl?: string | null;
  copany: Copany;
  onCopanyUpdate?: (copany: Copany) => void;
}

export default function LicenseView({ githubUrl, copany }: LicenseViewProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  // 使用 React Query hooks 替代 cacheManager
  const { data: currentUser } = useCurrentUser();
  const { data: licenseData, isLoading: isLicenseLoading } =
    useRepoLicense(githubUrl);

  const [licenseContent, setLicenseContent] = useState<string>(EMPTY_STRING);
  const [licenseType, setLicenseType] = useState<string | null>(copany.license);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // 使用 mutation 来更新 license
  const updateLicenseMutation = useMutation({
    mutationFn: async (licenseType: string) => {
      await updateCopanyLicenseAction(copany.id, licenseType);
      return licenseType;
    },
    onSuccess: (newLicenseType) => {
      // 更新本地状态
      setLicenseType(newLicenseType);
      // 使相关的查询失效
      queryClient.invalidateQueries({ queryKey: ["copany", copany.id] });
    },
  });

  // 稳定 mutation 的可变方法
  const mutateRef = useRef(updateLicenseMutation.mutate);
  useEffect(() => {
    mutateRef.current = updateLicenseMutation.mutate;
  }, [updateLicenseMutation.mutate]);

  // 处理 license 数据变化
  useEffect(() => {
    if (!licenseData) {
      setNotFound(true);
      setLicenseContent(EMPTY_STRING);
      return;
    }

    if (licenseData.content === "No License") {
      setNotFound(true);
      setLicenseContent(EMPTY_STRING);
      return;
    }

    try {
      setLicenseContent(licenseData.content);
      setNotFound(false);
      setError(null);
    } catch (_err) {
      setError("Failed to decode License content");
      setLicenseContent(EMPTY_STRING);
    }
  }, [licenseData]);

  // 检查并更新 license type
  useEffect(() => {
    if (!githubUrl || !licenseData || licenseData.content === "No License")
      return;

    if (licenseData.type && licenseData.type !== licenseType) {
      console.log(
        `📝 License type changed: ${licenseType} -> ${licenseData.type}`
      );
      // 使用 ref 来避免依赖整个 mutation 对象
      mutateRef.current(licenseData.type);
    }
  }, [githubUrl, licenseData, licenseType]);

  if (isLicenseLoading) {
    return (
      <div className="py-8 text-center">
        <LoadingView type="label" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (notFound) {
    const isOwner = currentUser?.id === copany.created_by;

    // 如果 copany 设置了默认使用 COSL，且无法获取到 GitHub license，则显示生成的 COSL license
    if (copany.isDefaultUseCOSL) {
      const coslLicenseContent = generateCOSLLicense(copany.name);

      return (
        <div className="space-y-4">
          <pre className="whitespace-pre-wrap break-words font-mono text-sm p-4 bg-gray-50 dark:bg-transparent rounded-lg">
            {coslLicenseContent}
          </pre>
        </div>
      );
    }

    return (
      <EmptyPlaceholderView
        icon={
          <ScaleIcon
            className="w-16 h-16 text-gray-500 dark:text-gray-400"
            strokeWidth={1}
          />
        }
        title="Add License"
        description={
          isOwner
            ? "Help protect your Copany by adding a License — choose how others can use, modify, and distribute your work."
            : "This repository does not have a License yet."
        }
        buttonIcon={
          isOwner ? <ArrowUpRightIcon className="w-4 h-4" /> : undefined
        }
        buttonTitle={isOwner ? "How to use COSL License" : undefined}
        buttonAction={() => router.push("/uselicense")}
      />
    );
  }

  const isOwner = currentUser?.id === copany.created_by;

  return (
    <div className="space-y-4">
      {licenseType !== "COSL" && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <CoslLicenseTip isOwner={isOwner} />
        </div>
      )}
      <Suspense
        fallback={
          <LoadingView type="label" label="Loading license content..." />
        }
      >
        <pre className="whitespace-pre-wrap break-words font-mono text-sm p-4 bg-gray-50 dark:bg-transparent rounded-lg">
          {licenseContent}
        </pre>
      </Suspense>
    </div>
  );
}
