"use client";

import { Suspense, useEffect, useState } from "react";
import MarkdownView from "@/components/commons/MarkdownView";
import LoadingView from "@/components/commons/LoadingView";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { MapIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { useRepoContributing } from "@/hooks/contributing";
import { useCurrentUser } from "@/hooks/currentUser";
import { usePreferredLanguage } from "@/utils/usePreferredLanguage";
import { EMPTY_STRING } from "@/utils/constants";

interface HowToContributionViewProps {
  githubUrl?: string | null;
}

const generateNewContributingUrl = (
  githubUrl: string,
  preferChinese?: boolean
): string | null => {
  try {
    const url = new URL(githubUrl);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    if (pathSegments.length >= 2) {
      const [owner, repo] = pathSegments;
      const cleanRepo = repo.replace(/\.git$/, "");
      const filename = preferChinese ? "CONTRIBUTING.zh.md" : "CONTRIBUTING.md";
      return `https://github.com/${owner}/${cleanRepo}/new/main?filename=${filename}`;
    }
    return null;
  } catch (_e) {
    return null;
  }
};

export default function HowToContributionView({
  githubUrl,
}: HowToContributionViewProps) {
  const { isChinesePreferred } = usePreferredLanguage();
  const { data: currentUser } = useCurrentUser();
  const isLoggedIn = !!currentUser;

  const { data, isLoading } = useRepoContributing(
    githubUrl,
    isChinesePreferred
  );
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
      ? generateNewContributingUrl(githubUrl, isChinesePreferred)
      : null;
    return (
      <EmptyPlaceholderView
        icon={
          <MapIcon
            className="w-16 h-16 text-gray-500 dark:text-gray-400"
            strokeWidth={1}
          />
        }
        title="Add CONTRIBUTING Guide"
        description={
          isLoggedIn
            ? "Help contributors get started by adding a CONTRIBUTING guide."
            : "This repository does not have a CONTRIBUTING guide yet. Log in to add one."
        }
        buttonIcon={
          isLoggedIn ? <ArrowUpRightIcon className="w-4 h-4" /> : undefined
        }
        buttonTitle={isLoggedIn ? "Add CONTRIBUTING" : undefined}
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
      <div className="pl-0 md:pl-5">
        <MarkdownView content={content} />
      </div>
    </Suspense>
  );
}
