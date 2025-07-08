"use client";

import { useState, useEffect } from "react";
import MarkdownView from "@/components/MarkdownView";
import { currentUserManager, readmeDataManager } from "@/utils/cache";
import { getRepoReadmeAction } from "@/actions/github.action";
import LoadingView from "@/components/commons/LoadingView";

interface ReadmeViewProps {
  githubUrl?: string;
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

        // 使用新的 SWR 策略：立即返回缓存 + 后台更新
        console.log("🔄 使用 SWR 策略获取 README 内容");
        const content = await readmeDataManager.getData(githubUrl, async () => {
          const readme = await getRepoReadmeAction(githubUrl);
          if (!readme?.content) {
            return "未找到 README 文件";
          }
          return decodeGitHubContent(readme.content);
        });

        setReadmeContent(content);
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
