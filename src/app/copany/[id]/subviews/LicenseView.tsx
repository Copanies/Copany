"use client";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/currentUser";
import { useRepoLicense } from "@/hooks/readme";
import { updateCopanyLicenseAction } from "@/actions/copany.actions";
import LoadingView from "@/components/commons/LoadingView";
import { ScaleIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { Copany } from "@/types/database.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface LicenseViewProps {
  githubUrl?: string | null;
  copany: Copany;
  onCopanyUpdate?: (copany: Copany) => void;
}

/**
 * Generate a link to create a new License file from GitHub URL
 * @param githubUrl GitHub repository URL
 * @returns Link to create a new License file, or null if parsing fails
 */
const generateNewLicenseUrl = (githubUrl: string): string | null => {
  try {
    const url = new URL(githubUrl);
    const pathSegments = url.pathname.split("/").filter(Boolean);

    if (pathSegments.length >= 2) {
      const [owner, repo] = pathSegments;
      // Remove possible .git suffix
      const cleanRepo = repo.replace(/\.git$/, "");
      // Construct URL for creating a new License file
      return `https://github.com/${owner}/${cleanRepo}/community/license/new`;
    }
    return null;
  } catch (error) {
    console.error("Failed to generate new License URL:", error);
    return null;
  }
};

export default function LicenseView({
  githubUrl,
  copany,
  onCopanyUpdate,
}: LicenseViewProps) {
  const queryClient = useQueryClient();

  // 使用 React Query hooks 替代 cacheManager
  const { data: currentUser } = useCurrentUser();
  const { data: licenseData, isLoading: isLicenseLoading } =
    useRepoLicense(githubUrl);

  const [licenseContent, setLicenseContent] = useState<string>("");
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
      // 调用父组件的更新回调
      onCopanyUpdate?.({
        ...copany,
        license: newLicenseType,
      });
      // 使相关的查询失效
      queryClient.invalidateQueries({ queryKey: ["copany", copany.id] });
    },
  });

  // 处理 license 数据变化
  useEffect(() => {
    if (!licenseData) {
      setNotFound(true);
      setLicenseContent("");
      return;
    }

    if (licenseData.content === "No License") {
      setNotFound(true);
      setLicenseContent("");
      return;
    }

    try {
      setLicenseContent(licenseData.content);
      setNotFound(false);
      setError(null);
    } catch (_err) {
      setError("Failed to decode License content");
      setLicenseContent("");
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
      // 使用 mutation 来更新
      updateLicenseMutation.mutate(licenseData.type);
    }
  }, [githubUrl, licenseData, licenseType, updateLicenseMutation]);

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
    const newLicenseUrl = githubUrl ? generateNewLicenseUrl(githubUrl) : null;
    const isLoggedIn = !!currentUser;

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
          isLoggedIn
            ? "Help protect your Copany by adding a License — choose how others can use, modify, and distribute your work."
            : "This repository does not have a License yet. Log in to add a License file."
        }
        buttonIcon={
          isLoggedIn ? <ArrowUpRightIcon className="w-4 h-4" /> : undefined
        }
        buttonTitle={isLoggedIn ? "Add License" : undefined}
        buttonAction={
          isLoggedIn && newLicenseUrl
            ? () => window.open(newLicenseUrl, "_blank")
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <pre className="whitespace-pre-wrap break-words font-mono text-sm p-4 bg-gray-50 dark:bg-transparent rounded-lg">
        {licenseContent}
      </pre>
    </div>
  );
}
