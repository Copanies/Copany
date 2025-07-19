"use client";

import { useState, useEffect } from "react";
import MarkdownView from "@/components/MarkdownView";
import { currentUserManager, readmeManager } from "@/utils/cache";
import { getRepoReadmeAction } from "@/actions/github.action";
import LoadingView from "@/components/commons/LoadingView";
import { BookOpenIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";

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
  const [readmeContent, setReadmeContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    console.log("ReadmeTabView mounted, starting to fetch README");

    const fetchReadme = async () => {
      try {
        setError(null);
        setNotFound(false);

        // Check if user is logged in, but don't prevent non-logged in users from viewing public repository README
        const user = await currentUserManager.getCurrentUser();
        setIsLoggedIn(!!user);

        if (!githubUrl) {
          setReadmeContent("No repository information found");
          return;
        }

        // First check if there's a cache, only show loading when network request is needed
        const cachedContent = readmeManager.getCachedReadme(githubUrl);

        if (cachedContent) {
          // Cache exists, immediately display cached content without showing loading
          if (cachedContent === "No README") {
            setNotFound(true);
            setReadmeContent("");
          } else {
            setReadmeContent(cachedContent);
          }

          // Refresh cache in background without showing loading
          readmeManager
            .getReadme(githubUrl, async () => {
              const readme = await getRepoReadmeAction(githubUrl);
              if (!readme?.content) {
                return "No README";
              }
              return decodeGitHubContent(readme.content);
            })
            .then((freshContent) => {
              // Only update UI when content has changed
              if (freshContent !== cachedContent) {
                if (freshContent === "No README") {
                  setNotFound(true);
                  setReadmeContent("");
                } else {
                  setNotFound(false);
                  setReadmeContent(freshContent);
                }
              }
            })
            .catch((error) => {
              console.warn("Background refresh README failed:", error);
            });
        } else {
          // No cache, network request needed, show loading
          setLoading(true);
          try {
            const content = await readmeManager.getReadme(
              githubUrl,
              async () => {
                const readme = await getRepoReadmeAction(githubUrl);
                if (!readme?.content) {
                  return "No README";
                }
                return decodeGitHubContent(readme.content);
              }
            );

            if (content === "No README") {
              setNotFound(true);
              setReadmeContent("");
            } else {
              setReadmeContent(content);
            }
          } finally {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Failed to get README:", err);

        const errorMessage = "Failed to get README content.";
        setError(errorMessage);
        setReadmeContent("");
      }
    };

    fetchReadme();
  }, [githubUrl]);

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

  return <MarkdownView content={readmeContent} />;
}
