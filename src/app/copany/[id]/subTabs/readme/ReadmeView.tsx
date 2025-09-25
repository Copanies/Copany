"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import MarkdownView from "@/components/commons/MarkdownView";
import { getRepoReadmeAction } from "@/actions/github.action";
import LoadingView from "@/components/commons/LoadingView";
import { BookOpenIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/currentUser";
import { EMPTY_STRING } from "@/utils/constants";

interface ReadmeViewProps {
  githubUrl?: string | null;
}

const decodeGitHubContent = (base64String: string): string => {
  try {
    const binaryString = atob(base64String);
    const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(bytes);
  } catch (error) {
    console.error("Failed to decode GitHub content:", error);
    throw new Error("Failed to decode GitHub content");
  }
};

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
  const [readmeContent, setReadmeContent] = useState<string>(EMPTY_STRING);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // 使用 React Query 获取当前用户
  const { data: currentUser } = useCurrentUser();
  const isLoggedIn = !!currentUser;

  // 使用 React Query 获取 README 内容
  const { data: readmeData, isLoading: isReadmeLoading } = useQuery({
    queryKey: ["readme", githubUrl],
    queryFn: async () => {
      if (!githubUrl) {
        return null;
      }

      try {
        const readme = await getRepoReadmeAction(githubUrl);
        if (!readme?.content) {
          return "No README";
        }
        return decodeGitHubContent(readme.content);
      } catch (error) {
        console.error("Failed to get README:", error);
        throw new Error("Failed to get README content.");
      }
    },
    enabled: !!githubUrl,
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 30 * 1000, // 30 seconds
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    console.log("ReadmeTabView mounted, starting to fetch README");

    if (!githubUrl) {
      setReadmeContent("No repository information found");
      return;
    }

    // 处理 README 数据
    if (readmeData === "No README") {
      setNotFound(true);
      setReadmeContent(EMPTY_STRING);
      setError(null);
    } else if (readmeData) {
      setNotFound(false);
      setReadmeContent(readmeData);
      setError(null);
    }
  }, [readmeData, githubUrl]);

  // 处理加载状态
  useEffect(() => {
    if (isReadmeLoading && !readmeData) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [isReadmeLoading, readmeData]);

  if (loading) {
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

  return (
    <Suspense fallback={<LoadingView type="label" label="Loading README..." />}>
      <MarkdownView content={readmeContent} />
    </Suspense>
  );
}
