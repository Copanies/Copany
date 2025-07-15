"use server";
import { getRepoReadme } from "@/services/github.service";

/**
 * 从 GitHub URL 中提取仓库路径
 * @param url GitHub 仓库 URL
 * @returns 仓库路径 (格式: owner/repo)，如果解析失败则返回 null
 */
function extractRepoPathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // 确保是 GitHub 域名
    if (urlObj.hostname !== "github.com") {
      console.warn("⚠️ 非 GitHub URL:", urlObj.hostname);
      return null;
    }

    // 提取路径部分，移除开头的 / 和可能的 .git 后缀
    const path = urlObj.pathname.replace(/^\//, "").replace(/\.git$/, "");

    // 分割路径
    const pathParts = path.split("/");

    if (pathParts.length < 2) {
      console.warn("⚠️ GitHub URL 路径格式不正确:", path);
      return null;
    }

    const owner = pathParts[0];
    const repo = pathParts[1];

    if (!owner || !repo) {
      console.warn("⚠️ 无法提取 owner 或 repo:", { owner, repo });
      return null;
    }

    return `${owner}/${repo}`;
  } catch (error) {
    console.error("❌ GitHub URL 解析失败:", error);
    return null;
  }
}

export async function getRepoReadmeAction(githubUrl: string) {
  const repoPath = extractRepoPathFromUrl(githubUrl);
  if (!repoPath) {
    throw new Error("Invalid GitHub URL");
  }
  const readme = await getRepoReadme(repoPath);
  return readme;
}
