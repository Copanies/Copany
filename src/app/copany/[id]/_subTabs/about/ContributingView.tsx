"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import MarkdownView from "@/components/commons/MarkdownView";
import LoadingView from "@/components/commons/LoadingView";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { MapIcon, ArrowUpRightIcon, SignalSlashIcon } from "@heroicons/react/24/outline";
import { useRepoContributing } from "@/hooks/githubDocs";
import { useCurrentUser } from "@/hooks/currentUser";
import { useLanguage } from "@/utils/useLanguage";

interface ContributingViewProps {
  githubUrl?: string | null;
}

const generateNewContributingUrl = (
  githubUrl: string,
  language: "zh" | "en"
): string | null => {
  try {
    const url = new URL(githubUrl);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    if (pathSegments.length >= 2) {
      const [owner, repo] = pathSegments;
      const cleanRepo = repo.replace(/\.git$/, "");
      const filename = language === "zh" ? "CONTRIBUTING.zh.md" : "CONTRIBUTING.md";
      return `https://github.com/${owner}/${cleanRepo}/new/main?filename=${filename}`;
    }
    return null;
  } catch (_e) {
    return null;
  }
};

export default function ContributingView({ githubUrl }: ContributingViewProps) {
  const t = useTranslations("emptyPlaceholder");
  const { language } = useLanguage();
  const { data: currentUser } = useCurrentUser();
  const isLoggedIn = !!currentUser;

  const {
    data: contributingResult,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useRepoContributing(githubUrl);

  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const contributingError = contributingResult?.error;
  const contributingContent = contributingResult?.content;

  // Show loading state during initial load or refetch
  if (isLoading || isFetching) {
    return (
      <div className="py-8 text-center">
        <LoadingView type="label" />
      </div>
    );
  }

  // Network error: show network error UI
  if (contributingError === "NETWORK_ERROR" || error || isOffline) {
    return (
      <EmptyPlaceholderView
        icon={
          <SignalSlashIcon
            className="w-16 h-16 text-gray-500 dark:text-gray-400"
            strokeWidth={1}
          />
        }
        titleKey="cannotLoadContributing"
        description={
          <span>
            {t("cannotLoadContributingDesc")}{" "}
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

  // No CONTRIBUTING found (404) or content is "No CONTRIBUTING"
  if (
    contributingError === "NOT_FOUND" ||
    !contributingContent ||
    contributingContent === "No CONTRIBUTING"
  ) {
    const newContribUrl = githubUrl
      ? generateNewContributingUrl(githubUrl, language)
      : null;
    return (
      <EmptyPlaceholderView
        icon={
          <MapIcon
            className="w-16 h-16 text-gray-500 dark:text-gray-400"
            strokeWidth={1}
          />
        }
        titleKey="addContributingGuide"
        descriptionKey={
          isLoggedIn
            ? "addContributingGuideDesc"
            : "addContributingGuideDescNotLoggedIn"
        }
        buttonIcon={
          isLoggedIn ? <ArrowUpRightIcon className="w-4 h-4" /> : undefined
        }
        buttonTitleKey={isLoggedIn ? "addContributing" : undefined}
        buttonAction={
          isLoggedIn && newContribUrl
            ? () => window.open(newContribUrl, "_blank")
            : undefined
        }
      />
    );
  }

  return (
    <Suspense
      fallback={<LoadingView type="label" label="Loading CONTRIBUTING..." />}
    >
      <div className="pl-0">
        <MarkdownView content={contributingContent} />
      </div>
    </Suspense>
  );
}
