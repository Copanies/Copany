"use client";

import { Suspense } from "react";
import MarkdownView from "@/components/commons/MarkdownView";
import LoadingView from "@/components/commons/LoadingView";
import { BookOpenIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { useCurrentUser } from "@/hooks/currentUser";
import { usePreferredLanguage } from "@/utils/usePreferredLanguage";
import { useRepoReadme } from "@/hooks/readme";

interface ReadmeViewProps {
  githubUrl?: string | null;
}

/**
 * Generate a link to create a new README file from GitHub URL
 * @param githubUrl GitHub repository URL
 * @returns Link to create a new README file, or null if parsing fails
 */
const generateNewReadmeUrl = (githubUrl: string): string | null => {
  try {
    const url = new URL(githubUrl);
    const pathSegments = url.pathname.split("/").filter(Boolean);

    if (pathSegments.length >= 2) {
      const [owner, repo] = pathSegments;
      // Remove possible .git suffix
      const cleanRepo = repo.replace(/\.git$/, "");
      // Construct URL for creating a new README file
      return `https://github.com/${owner}/${cleanRepo}/new/main?filename=README.md`;
    }
    return null;
  } catch (error) {
    console.error("Failed to generate new README URL:", error);
    return null;
  }
};

export default function ReadmeView({ githubUrl }: ReadmeViewProps) {
  // 使用语言检测 hook
  const { isChinesePreferred } = usePreferredLanguage();

  // 使用当前用户 hook
  const { data: currentUser } = useCurrentUser();
  const isLoggedIn = !!currentUser;

  // 使用 README hook，根据语言偏好获取内容
  const {
    data: readmeContent,
    isLoading,
    error,
  } = useRepoReadme(githubUrl, isChinesePreferred);

  // 处理加载状态
  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <LoadingView type="label" />
      </div>
    );
  }

  // 处理错误状态
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
        <p className="text-red-600 dark:text-red-400">
          Failed to load README content.
        </p>
      </div>
    );
  }

  // 处理无 README 的情况
  if (!readmeContent || readmeContent === "No README") {
    const newReadmeUrl = githubUrl ? generateNewReadmeUrl(githubUrl) : null;

    return (
      <EmptyPlaceholderView
        icon={
          <BookOpenIcon
            className="w-16 h-16 text-gray-500 dark:text-gray-400"
            strokeWidth={1}
          />
        }
        title="Add README"
        description={
          isLoggedIn
            ? "Help people learn about your Copany by adding a README — share its purpose, how it works, and how others can contribute."
            : "This repository does not have a README yet. Log in to add a README file."
        }
        buttonIcon={
          isLoggedIn ? <ArrowUpRightIcon className="w-4 h-4" /> : undefined
        }
        buttonTitle={isLoggedIn ? "Add README" : undefined}
        buttonAction={
          isLoggedIn && newReadmeUrl
            ? () => window.open(newReadmeUrl, "_blank")
            : undefined
        }
      />
    );
  }

  // 显示 README 内容
  return (
    <Suspense fallback={<LoadingView type="label" label="Loading README..." />}>
      <MarkdownView content={readmeContent} />
    </Suspense>
  );
}
