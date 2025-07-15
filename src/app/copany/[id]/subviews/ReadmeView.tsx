"use client";

import { useState, useEffect } from "react";
import MarkdownView from "@/components/MarkdownView";
import { currentUserManager, readmeManager } from "@/utils/cache";
import { getRepoReadmeAction } from "@/actions/github.action";
import LoadingView from "@/components/commons/LoadingView";
import { BookOpenIcon } from "@heroicons/react/24/outline";
import Button from "@/components/commons/Button";

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
    console.error("解码失败:", error);
    throw new Error("无法解码 GitHub 内容");
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
    console.error("生成新建 README URL 失败:", error);
    return null;
  }
};

export default function ReadmeView({ githubUrl }: ReadmeViewProps) {
  const [readmeContent, setReadmeContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    console.log("ReadmeTabView mounted, starting to fetch README");

    const fetchReadme = async () => {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);

        // 检查用户是否已登录（使用缓存管理器）
        const user = await currentUserManager.getCurrentUser();

        if (!user) {
          setReadmeContent("请先登录以查看 README 内容");
          setLoading(false);
          return;
        }

        if (!githubUrl) {
          setReadmeContent("未找到仓库信息");
          setLoading(false);
          return;
        }

        // 使用新的 SWR 策略：立即返回缓存 + 后台更新
        console.log("🔄 使用 SWR 策略获取 README 内容");

        const content = await readmeManager.getReadme(githubUrl, async () => {
          const readme = await getRepoReadmeAction(githubUrl);
          console.log("readme", readme);
          if (!readme?.content) {
            setNotFound(true);
            setReadmeContent("");
            return "";
          }
          return decodeGitHubContent(readme.content);
        });
        setReadmeContent(content);
      } catch (err) {
        console.error("获取 README 失败:", err);

        const errorMessage = "无法获取 README 内容。";
        setError(errorMessage);
        setReadmeContent("");
      } finally {
        setLoading(false);
      }
    };

    fetchReadme();
  }, [githubUrl]);

  if (loading) {
    return <LoadingView type="label" />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (notFound) {
    const newReadmeUrl = githubUrl ? generateNewReadmeUrl(githubUrl) : null;

    return (
      <div className="py-8 text-center">
        <div className="flex flex-col items-center gap-5">
          <BookOpenIcon className="w-10 h-10 text-gray-500 dark:text-gray-400" />
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Add a README
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Help people interested in this repository understand your project
              by adding a README.
            </p>
          </div>
          {newReadmeUrl && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                window.open(newReadmeUrl, "_blank");
              }}
            >
              <p>Add a README</p>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return <MarkdownView content={readmeContent} />;
}
