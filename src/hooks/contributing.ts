"use client";

import { useQuery } from "@tanstack/react-query";
import { getRepoContributingAction } from "@/actions/github.action";

function contributingKey(githubUrl: string) { return ["contributing", githubUrl] as const; }

const decodeGitHubContent = (base64String: string): string => {
  const binaryString = typeof atob !== "undefined" ? atob(base64String) : Buffer.from(base64String, "base64").toString("binary");
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(bytes);
};

export function useRepoContributing(githubUrl?: string | null, preferChinese?: boolean) {
  return useQuery<string>({
    queryKey: githubUrl ? [...contributingKey(githubUrl), preferChinese ? "zh" : "en"] : ["contributing", "none"],
    queryFn: async () => {
      if (!githubUrl) return "No CONTRIBUTING";
      console.log("useRepoContributing", githubUrl, preferChinese);
      
      try {
        // If Chinese is preferred, try to get CONTRIBUTING.zh.md first
        if (preferChinese) {
          try {
            const res = await getRepoContributingAction(githubUrl, "CONTRIBUTING.zh.md");
            if (res && !Array.isArray(res) && "content" in res && res.content) {
              return decodeGitHubContent(res.content);
            }
          } catch {
            // Continue to fallback to default CONTRIBUTING
          }
        }
        
        // Try default CONTRIBUTING (either as fallback for Chinese or primary for non-Chinese)
        try {
          const res = await getRepoContributingAction(githubUrl);
          if (!res || Array.isArray(res) || !("content" in res) || !res.content) return "No CONTRIBUTING";
          return decodeGitHubContent(res.content);
        } catch {
          return "No CONTRIBUTING";
        }
      } catch {
        return "No CONTRIBUTING";
      }
    },
    enabled: !!githubUrl,
    staleTime: 1 * 10 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}


