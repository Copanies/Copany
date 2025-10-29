"use client";

import { Suspense } from "react";
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

export default function ReadmeView({ githubUrl }: ReadmeViewProps) {
  const { isChinesePreferred } = usePreferredLanguage();

  const { data: currentUser } = useCurrentUser();
  const isLoggedIn = !!currentUser;

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
        title="Cannot load README"
        description={
          <span>
            Network issue prevents fetching README from GitHub. It may be caused
            by VPN/proxy connectivity. Please check your connection and try
            again.{" "}
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
        buttonTitle="Retry"
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
        title="Add README"
        description={
          isLoggedIn
            ? "Help people learn about your Copany by adding a README — share its purpose, how it works, and how others can contribute."
            : "This repository does not have a README yet."
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

  return (
    <Suspense fallback={<LoadingView type="label" label="Loading README..." />}>
      <MarkdownView content={readmeContent} />
    </Suspense>
  );
}
