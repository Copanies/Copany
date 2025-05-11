"use server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { CopanyService } from "@/services/copanyService";
import { Copany } from "@/types/types";
import { Octokit } from "@octokit/rest";
import type { RestEndpointMethodTypes } from "@octokit/rest";
import { auth, signIn } from "@/app/auth";

export async function getCopanies() {
  const apiService = new CopanyService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  return await apiService.getAll();
}

export async function updateCopany(
  id: number,
  copany: Partial<Omit<Copany, "id" | "created_at" | "updated_at">>
) {
  const apiService = new CopanyService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  return await apiService.update(id, copany);
}

export async function createCopany(url: string) {
  const session = await auth();
  if (!session?.user?.id) {
    console.log("Signing in");
    await signIn();
    return;
  }
  const githubRepoInfoResponse = await getGithubRepoInfo(url);
  console.log(
    "githubRepoInfoResponse",
    githubRepoInfoResponse.full_name,
    githubRepoInfoResponse.language,
    githubRepoInfoResponse.organization?.avatar_url,
    githubRepoInfoResponse
  );
  const copany: Omit<Copany, "id" | "created_at" | "updated_at"> = {
    name: githubRepoInfoResponse.full_name,
    description: githubRepoInfoResponse.description || "",
    github_url: githubRepoInfoResponse.html_url,
    created_by: session.user.id,
    organization_avatar_url:
      githubRepoInfoResponse.organization?.avatar_url || null,
    project_type: "Test Project Type",
    project_stage: "Test Project Stage",
    main_language: githubRepoInfoResponse.language || "Test Main Language",
    license: githubRepoInfoResponse.license?.key || "Test License",
  };
  const apiService = new CopanyService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  return await apiService.create(copany);
}

export async function deleteCopany(id: number) {
  const apiService = new CopanyService(
    (await getCloudflareContext({ async: true })).env.DB
  );
  return await apiService.delete(id);
}

// get github info from url
// example: https://github.com/jinhongw/Copany
// example: https://github.com/jinhongw/Copany.git
// GET https://api.github.com/repos/{owner}/{repo}
export async function getGithubRepoInfo(
  url: string
): Promise<RestEndpointMethodTypes["repos"]["get"]["response"]["data"]> {
  const { owner, repo } = parseGithubUrl(url) || { owner: "", repo: "" };
  const octokit = new Octokit();
  const response = await octokit.request(`GET /repos/${owner}/${repo}`);
  return response.data;
}

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean); // 移除空段
    if (segments.length >= 2) {
      const [owner, repoWithExtension] = segments;
      const repo = repoWithExtension.replace(/\.git$/, "");
      return { owner, repo };
    }
    return null;
  } catch (e) {
    return null;
  }
}
