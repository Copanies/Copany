"use server";
import {
  extractRepoPathFromUrl,
  getRepoReadme,
} from "@/services/github.service";

export async function getRepoReadmeAction(githubUrl: string) {
  const repoPath = extractRepoPathFromUrl(githubUrl);
  if (!repoPath) {
    throw new Error("Invalid GitHub URL");
  }
  const readme = await getRepoReadme(repoPath);
  return readme;
}
