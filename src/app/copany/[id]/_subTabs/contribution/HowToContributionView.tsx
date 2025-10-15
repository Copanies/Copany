"use client";

import { Suspense, useEffect, useState } from "react";
import MarkdownView from "@/components/commons/MarkdownView";
import LoadingView from "@/components/commons/LoadingView";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { BookOpenIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { useRepoContributing } from "@/hooks/contributing";
import { useCurrentUser } from "@/hooks/currentUser";
import { EMPTY_STRING } from "@/utils/constants";

interface HowToContributionViewProps {
  copanyId: string;
  githubUrl?: string | null;
}

const generateNewContributingUrl = (githubUrl: string): string | null => {
  try {
    const url = new URL(githubUrl);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    if (pathSegments.length >= 2) {
      const [owner, repo] = pathSegments;
      const cleanRepo = repo.replace(/\.git$/, "");
      return `https://github.com/${owner}/${cleanRepo}/new/main?filename=CONTRIBUTING.md`;
    }
    return null;
  } catch (_e) {
    return null;
  }
};

export default function HowToContributionView({
  copanyId,
  githubUrl,
}: HowToContributionViewProps) {
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
      ? generateNewContributingUrl(githubUrl)
      : null;
    return (
      <EmptyPlaceholderView
        icon={
          <BookOpenIcon
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
      <div className="pl-5">
        <MarkdownView content={content} />
      </div>
    </Suspense>
  );
}
