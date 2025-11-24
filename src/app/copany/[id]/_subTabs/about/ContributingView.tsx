"use client";

import { Suspense, useEffect, useState } from "react";
import MarkdownView from "@/components/commons/MarkdownView";
import LoadingView from "@/components/commons/LoadingView";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { MapIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { useRepoContributing } from "@/hooks/contributing";
import { useCurrentUser } from "@/hooks/currentUser";
import { useLanguage } from "@/utils/useLanguage";
import { EMPTY_STRING } from "@/utils/constants";

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
  const { language } = useLanguage();
  const { data: currentUser } = useCurrentUser();
  const isLoggedIn = !!currentUser;

  const { data, isLoading } = useRepoContributing(githubUrl);
  const [content, setContent] = useState<string>(EMPTY_STRING);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!githubUrl) {
      setContent("No repository information found");
      setNotFound(false);
      return;
    }

    if (data === "No CONTRIBUTING") {
      setNotFound(true);
      setContent(EMPTY_STRING);
    } else if (data) {
      setNotFound(false);
      setContent(data);
    }
  }, [data, githubUrl]);

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <LoadingView type="label" />
      </div>
    );
  }

  if (notFound) {
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
        <MarkdownView content={content} />
      </div>
    </Suspense>
  );
}
