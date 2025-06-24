"use client";

import { useState, useEffect } from "react";
import MarkdownView from "@/components/MarkdownView";
import { getCurrentUser } from "@/actions/auth.actions";
import { getRepoReadmeAction } from "@/actions/github.action";

interface ReadmeViewProps {
  githubUrl?: string;
}

const decodeGitHubContent = (base64String: string): string => {
  try {
    return Buffer.from(base64String, "base64").toString("utf-8");
  } catch (error) {
    console.error("解码失败:", error);
    throw new Error("无法解码 GitHub 内容");
  }
};

export default function ReadmeTabView({ githubUrl }: ReadmeViewProps) {
  const [readmeContent, setReadmeContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("ReadmeTabView mounted, starting to fetch README");

    const fetchReadme = async () => {
      try {
        setLoading(true);
        setError(null);

        // 检查用户是否已登录
        const user = await getCurrentUser();

        if (!user) {
          setReadmeContent("请先登录以查看 README 内容");
          return;
        }

        if (!githubUrl) {
          setReadmeContent("未找到仓库信息");
          return;
        }

        const readme = await getRepoReadmeAction(githubUrl);
        if (readme?.content) {
          const content = decodeGitHubContent(readme.content);
          setReadmeContent(content);
        } else {
          setReadmeContent("未找到 README 文件");
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
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
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
