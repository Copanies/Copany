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
 * 从 GitHub URL 生成新建 README 文件的链接
 * @param githubUrl GitHub 仓库 URL
 * @returns 新建 README 文件的链接，如果解析失败则返回 null
 */
const generateNewReadmeUrl = (githubUrl: string): string | null => {
  try {
    const url = new URL(githubUrl);
    const pathSegments = url.pathname.split("/").filter(Boolean);

    if (pathSegments.length >= 2) {
      const [owner, repo] = pathSegments;
      // 移除可能的 .git 后缀
      const cleanRepo = repo.replace(/\.git$/, "");
      // 构造新建 README 文件的 URL
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

        // 检查用户是否已登录，但不阻止未登录用户查看公共仓库的 README
        const user = await currentUserManager.getCurrentUser();
        setIsLoggedIn(!!user);

        if (!githubUrl) {
          setReadmeContent("No repository information found");
          return;
        }

        // 首先检查是否有缓存，只有在需要网络请求时才显示 loading
        const cachedContent = readmeManager.getCachedReadme(githubUrl);

        if (cachedContent) {
          // 有缓存，立即显示缓存内容，不显示 loading
          if (cachedContent === "No README") {
            setNotFound(true);
            setReadmeContent("");
          } else {
            setReadmeContent(cachedContent);
          }

          // 后台刷新缓存，不显示 loading
          readmeManager
            .getReadme(githubUrl, async () => {
              const readme = await getRepoReadmeAction(githubUrl);
              if (!readme?.content) {
                return "No README";
              }
              return decodeGitHubContent(readme.content);
            })
            .then((freshContent) => {
              // 只有当内容发生变化时才更新UI
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
          // 无缓存，需要网络请求，显示 loading
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
