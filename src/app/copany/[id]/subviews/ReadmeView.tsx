"use client";

import { useState, useEffect } from "react";
import MarkdownView from "@/components/MarkdownView";
import { currentUserManager } from "@/utils/cache";
import { getRepoReadmeAction } from "@/actions/github.action";
import LoadingView from "@/components/commons/LoadingView";
import { readmeCache } from "@/utils/cache";

interface ReadmeViewProps {
  githubUrl?: string;
}

const decodeGitHubContent = (base64String: string): string => {
  try {
    // 客户端环境下直接使用浏览器 API
    return decodeURIComponent(escape(atob(base64String)));
  } catch (error) {
    console.error("解码失败:", error);
    throw new Error("无法解码 GitHub 内容");
  }
};

export default function ReadmeView({ githubUrl }: ReadmeViewProps) {
  const [readmeContent, setReadmeContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("ReadmeTabView mounted, starting to fetch README");

    const fetchReadme = async () => {
      try {
        setLoading(true);
        setError(null);

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

        // 首先尝试从缓存获取
        const cachedContent = readmeCache.get(githubUrl);
        if (cachedContent) {
          console.log("📦 使用缓存的 README 内容");
          setReadmeContent(cachedContent);
          setLoading(false);
          return;
        }

        // 缓存未命中，从 API 获取
        console.log("🌐 从 API 获取 README 内容");
        const readme = await getRepoReadmeAction(githubUrl);
        if (readme?.content) {
          const content = decodeGitHubContent(readme.content);
          setReadmeContent(content);

          // 保存到缓存
          readmeCache.set(githubUrl, content);
        } else {
          const notFoundMessage = "未找到 README 文件";
          setReadmeContent(notFoundMessage);
        }
      } catch (err) {
        console.error("获取 README 失败:", err);
        const errorMessage =
          "无法获取 README 内容。请确保您已登录并有权限访问此仓库。";
        setError(errorMessage);
        setReadmeContent(errorMessage);
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

  return <MarkdownView content={readmeContent} />;
}
