import MarkdownView from "@/components/MarkdownView";
import TabView from "@/components/TabView";
import {
  extractRepoPathFromUrl,
  getRepoReadme,
} from "@/services/github.service";
import { CopanyService } from "@/services/copany.service";
import { getCurrentUser } from "@/actions/auth.actions";
import Image from "next/image";
// import IssuesView from "./IssuesView";

const decodeGitHubContent = (base64String: string): string => {
  try {
    return Buffer.from(base64String, "base64").toString("utf-8");
  } catch (error) {
    console.error("解码失败:", error);
    throw new Error("无法解码 GitHub 内容");
  }
};

export default async function CopanyDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    // 首先检查用户是否已登录
    const user = await getCurrentUser();
    console.log("当前用户:", user ? "已登录" : "未登录");

    const copany = await CopanyService.getCopanyById(id);
    console.log("copany", copany?.name);

    // 只有用户已登录时才尝试获取 README
    let readme = null;
    let readmeContent = "";

    if (user && copany?.github_url) {
      try {
        // 从 GitHub URL 中提取 owner/repo 格式
        const repoPath = extractRepoPathFromUrl(copany.github_url);
        if (repoPath) {
          readme = await getRepoReadme(repoPath);
          if (readme?.content) {
            readmeContent = decodeGitHubContent(readme.content);
          }
        } else {
          readmeContent = "无法解析 GitHub 仓库路径";
        }
      } catch (readmeError) {
        console.error("获取 README 失败:", readmeError);
        readmeContent =
          "无法获取 README 内容。请确保您已登录并有权限访问此仓库。";
      }
    } else {
      readmeContent = user ? "未找到仓库信息" : "请先登录以查看 README 内容";
    }

    return (
      <div className="p-8 max-w-screen-lg mx-auto gap-4 flex flex-col">
        <div className="flex flex-col gap-1">
          <Image
            src={copany?.organization_avatar_url || ""}
            alt={copany?.name || ""}
            width={100}
            height={100}
            className="border-1 border-gray-300 dark:border-gray-700"
          />
          <h1 className="text-2xl font-bold">{copany?.name}</h1>
          <p className="">{copany?.description}</p>
          <p className="">{copany?.github_url}</p>
        </div>
        <TabView
          tabs={[
            {
              label: "README",
              content: <MarkdownView content={readmeContent} />,
            },
          ]}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching copany", error.message);
      return <div className="p-4">Error fetching copany: {error.message}</div>;
    } else {
      console.error("Error fetching copany", error);
      return <div className="p-4">Error fetching copany</div>;
    }
  }
}
