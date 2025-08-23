"use client";

import { useQuery } from "@tanstack/react-query";
import { getRepoReadmeAction, getRepoLicenseAction, getRepoLicenseTypeAction } from "@/actions/github.action";

function readmeKey(githubUrl: string) { return ["readme", githubUrl] as const; }
function licenseKey(githubUrl: string) { return ["license", githubUrl] as const; }

const decodeGitHubContent = (base64String: string): string => {
  const binaryString = typeof atob !== "undefined" ? atob(base64String) : Buffer.from(base64String, "base64").toString("binary");
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(bytes);
};

export function useRepoReadme(githubUrl?: string | null) {
  return useQuery<string>({
    queryKey: githubUrl ? readmeKey(githubUrl) : ["readme", "none"],
    queryFn: async () => {
      if (!githubUrl) return "No README";
      const res = await getRepoReadmeAction(githubUrl);
      if (!res?.content) return "No README";
      return decodeGitHubContent(res.content);
    },
    enabled: !!githubUrl,
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 60 * 60 * 1000, // 1 hour 
  });
}

export function useRepoLicense(githubUrl?: string | null) {
  return useQuery<{ content: string; type: string | null }>({
    queryKey: githubUrl ? licenseKey(githubUrl) : ["license", "none"],
    queryFn: async () => {
      if (!githubUrl) return { content: "No License", type: null };
      const license = await getRepoLicenseAction(githubUrl);
      if (!license || Array.isArray(license) || !("content" in license)) {
        return { content: "No License", type: null };
      }
      const type = await getRepoLicenseTypeAction(githubUrl);
      return { content: decodeGitHubContent(license.content), type: type ?? null };
    },
    enabled: !!githubUrl,
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 60 * 60 * 1000, // 1 hour 
  });
}


