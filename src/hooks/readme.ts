"use client";

import { useQuery } from "@tanstack/react-query";
import { getRepoReadmeWithFilenameAction, getRepoLicenseAction, getRepoLicenseTypeAction } from "@/actions/github.action";

function readmeKey(githubUrl: string) { return ["readme", githubUrl] as const; }
function licenseKey(githubUrl: string) { return ["license", githubUrl] as const; }

const decodeGitHubContent = (base64String: string): string => {
  const binaryString = typeof atob !== "undefined" ? atob(base64String) : Buffer.from(base64String, "base64").toString("binary");
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(bytes);
};

export function useRepoReadme(githubUrl?: string | null, preferChinese?: boolean) {
  return useQuery<string>({
    queryKey: githubUrl ? [...readmeKey(githubUrl), preferChinese ? "zh" : "en"] : ["readme", "none"],
    queryFn: async () => {
      if (!githubUrl) return "No README";
      console.log("useRepoReadme", githubUrl, preferChinese);
      
      try {
        // If Chinese is preferred, try to get README.zh.md first
        if (preferChinese) {
          try {
            const res = await fetch(`/api/readme?githubUrl=${encodeURIComponent(githubUrl)}&type=readme&filename=README.zh.md`);
            if (res.ok) {
              const json = await res.json();
              if (json.content && json.content !== "No README") {
                return json.content as string;
              }
            }
          } catch {
            // Fallback to action if API fails
            try {
              const res = await getRepoReadmeWithFilenameAction(githubUrl, "README.zh.md");
              if (res && !Array.isArray(res) && "content" in res && res.content) {
                return decodeGitHubContent(res.content);
              }
            } catch {
              // Continue to fallback to default README
            }
          }
        }
        
        // Try default README (either as fallback for Chinese or primary for non-Chinese)
        try {
          const res = await fetch(`/api/readme?githubUrl=${encodeURIComponent(githubUrl)}&type=readme`);
          if (!res.ok) throw new Error("request failed");
          const json = await res.json();
          return json.content as string;
        } catch {
          const res = await getRepoReadmeWithFilenameAction(githubUrl);
          if (!res || Array.isArray(res) || !("content" in res) || !res.content) return "No README";
          return decodeGitHubContent(res.content);
        }
      } catch {
        return "No README";
      }
    },
    enabled: !!githubUrl,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

export function useRepoLicense(githubUrl?: string | null) {
  return useQuery<{ content: string; type: string | null }>({
    queryKey: githubUrl ? licenseKey(githubUrl) : ["license", "none"],
    queryFn: async () => {
      if (!githubUrl) return { content: "No License", type: null };
      try {
        const res = await fetch(`/api/readme?githubUrl=${encodeURIComponent(githubUrl)}&type=license`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return { content: json.content as string, type: json.type as string | null };
      } catch {
        const license = await getRepoLicenseAction(githubUrl);
        if (!license || Array.isArray(license) || !("content" in license)) {
          return { content: "No License", type: null };
        }
        const type = await getRepoLicenseTypeAction(githubUrl);
        return { content: decodeGitHubContent(license.content), type: type ?? null };
      }
    },
    enabled: !!githubUrl,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}


