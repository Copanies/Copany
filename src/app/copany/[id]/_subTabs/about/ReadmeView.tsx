"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import MarkdownView from "@/components/commons/MarkdownView";
import LoadingView from "@/components/commons/LoadingView";
import {
  BookOpenIcon,
  ArrowUpRightIcon,
  SignalSlashIcon,
} from "@heroicons/react/24/outline";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { useCurrentUser } from "@/hooks/currentUser";
import { usePreferredLanguage } from "@/utils/usePreferredLanguage";
import { useRepoReadme } from "@/hooks/readme";
import type { Copany } from "@/types/database.types";

interface ReadmeViewProps {
  githubUrl?: string | null;
  copany?: Copany;
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
      const url = `https://github.com/${owner}/${cleanRepo}/new/main?filename=README.md`;
      console.log("url", url);
      return url;
    }
    return null;
  } catch (error) {
    console.error("Failed to generate new README URL:", error);
    return null;
  }
};

export default function ReadmeView({ githubUrl, copany }: ReadmeViewProps) {
  const { isChinesePreferred } = usePreferredLanguage();
  const t = useTranslations("emptyPlaceholder");

  const { data: currentUser } = useCurrentUser();
  const isLoggedIn = !!currentUser;

  // Check if current user is the owner of the copany
  const isOwner = !!(
    copany &&
    currentUser &&
    copany.created_by === currentUser.id
  );

  const {
    data: readmeResult,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useRepoReadme(githubUrl, isChinesePreferred);

  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const readmeError = readmeResult?.error;
  const readmeContent = readmeResult?.content;

  // Show loading state during initial load or refetch
  if (isLoading || isFetching) {
    return (
      <div className="py-8 text-center">
        <LoadingView type="label" />
      </div>
    );
  }

  // Network error: show network error UI
  if (readmeError === "NETWORK_ERROR" || error || isOffline) {
    return (
      <EmptyPlaceholderView
        icon={
          <SignalSlashIcon
            className="w-16 h-16 text-gray-500 dark:text-gray-400"
            strokeWidth={1}
          />
        }
        titleKey="cannotLoadReadme"
        description={
          <span>
            {t("cannotLoadReadmeDesc")}{" "}
            {githubUrl ? (
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                Open on GitHub
                <ArrowUpRightIcon className="w-4 h-4" />
              </a>
            ) : null}
          </span>
        }
        buttonTitleKey="retry"
        buttonAction={() => refetch()}
      />
    );
  }

  // No README found (404) or content is "No README"
  if (
    readmeError === "NOT_FOUND" ||
    !readmeContent ||
    readmeContent === "No README"
  ) {
    const newReadmeUrl = githubUrl ? generateNewReadmeUrl(githubUrl) : null;

    return (
      <EmptyPlaceholderView
        icon={
          <BookOpenIcon
            className="w-16 h-16 text-gray-500 dark:text-gray-400"
            strokeWidth={1}
          />
        }
        titleKey="addReadme"
        descriptionKey={isOwner ? "addReadmeDesc" : "noReadmeDesc"}
        buttonIcon={
          isOwner ? <ArrowUpRightIcon className="w-4 h-4" /> : undefined
        }
        buttonTitleKey={isOwner ? "addReadme" : undefined}
        buttonAction={
          isOwner && newReadmeUrl
            ? () => window.open(newReadmeUrl, "_blank")
            : undefined
        }
      />
    );
  }

  return (
    <Suspense fallback={<LoadingView type="label" label="Loading README..." />}>
      <MarkdownView content={readmeContent} />
    </Suspense>
  );
}
