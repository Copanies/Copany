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

export function useRepoContributing(githubUrl?: string | null) {
  return useQuery<string>({
    queryKey: githubUrl ? contributingKey(githubUrl) : ["contributing", "none"],
    queryFn: async () => {
      if (!githubUrl) return "No CONTRIBUTING";
      try {
        // We currently do not add a dedicated API route; call action directly
        const res = await getRepoContributingAction(githubUrl);
        if (!res || Array.isArray(res) || !("content" in res)) return "No CONTRIBUTING";
        return decodeGitHubContent(res.content as string);
      } catch {
        return "No CONTRIBUTING";
      }
    },
    enabled: !!githubUrl,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}


