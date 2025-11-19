"use client";

import { useQuery } from "@tanstack/react-query";
import { getRepoReadmeWithFilenameAction, getRepoLicenseAction, getRepoLicenseTypeAction } from "@/actions/github.action";

function readmeKey(githubUrl: string) { return ["readme", githubUrl] as const; }
function licenseKey(githubUrl: string) { return ["license", githubUrl] as const; }

// Error types for README fetching
export type ReadmeErrorType = "NETWORK_ERROR" | "NOT_FOUND";

export interface ReadmeResult {
  content?: string;
  error?: ReadmeErrorType;
}

const decodeGitHubContent = (base64String: string): string => {
  const binaryString = typeof atob !== "undefined" ? atob(base64String) : Buffer.from(base64String, "base64").toString("binary");
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(bytes);
};

export function useRepoReadme(githubUrl?: string | null, preferChinese?: boolean) {
  return useQuery<ReadmeResult>({
    queryKey: githubUrl ? [...readmeKey(githubUrl), preferChinese ? "zh" : "en"] : ["readme", "none"],
    queryFn: async () => {
      if (!githubUrl) return { content: "No README", error: "NOT_FOUND" };
      console.log("useRepoReadme", githubUrl, preferChinese);
      
      try {
        // If Chinese is preferred, try to get README.zh.md first
        if (preferChinese) {
          try {
            const res = await fetch(`/api/readme?githubUrl=${encodeURIComponent(githubUrl)}&type=readme&filename=README.zh.md`);
            if (res.ok) {
              const json = await res.json();
              if (json.error) {
                // If API returns error type, preserve it
                return { error: json.error as ReadmeErrorType };
              }
              if (json.content && json.content !== "No README") {
                return { content: json.content as string };
              }
            } else if (res.status >= 500) {
              // Server error (5xx) indicates network/server issue
              return { error: "NETWORK_ERROR" };
            }
          } catch (_error) {
            // Network error (fetch failed, timeout, etc.)
            return { error: "NETWORK_ERROR" };
          }
        }
        
        // Try default README (either as fallback for Chinese or primary for non-Chinese)
        try {
          const res = await fetch(`/api/readme?githubUrl=${encodeURIComponent(githubUrl)}&type=readme`);
          if (!res.ok) {
            if (res.status >= 500) {
              // Server error indicates network/server issue
              return { error: "NETWORK_ERROR" };
            }
            // Try fallback to action
            throw new Error("request failed");
          }
          const json = await res.json();
          if (json.error) {
            // If API returns error type, preserve it
            return { error: json.error as ReadmeErrorType };
          }
          if (json.content === "No README") {
            return { content: "No README", error: "NOT_FOUND" };
          }
          return { content: json.content as string };
        } catch (_error) {
          // Fallback to action for network errors or when API fails
          try {
            const res = await getRepoReadmeWithFilenameAction(githubUrl);
            if (!res || Array.isArray(res) || !("content" in res) || !res.content) {
              return { content: "No README", error: "NOT_FOUND" };
            }
            return { content: decodeGitHubContent(res.content) };
          } catch (_actionError) {
            // Action failed - likely network error
            return { error: "NETWORK_ERROR" };
          }
        }
      } catch (_error) {
        // Any other error is treated as network error
        return { error: "NETWORK_ERROR" };
      }
    },
    enabled: !!githubUrl,
    staleTime: 12 * 60 * 60 * 1000, // 1 hour
    refetchInterval: 12 * 60 * 60 * 1000,
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
    staleTime: 12 * 60 * 60 * 1000, // 1 hour
    refetchInterval: 12 * 60 * 60 * 1000,
  });
}


