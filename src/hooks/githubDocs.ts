"use client";

import { useQuery } from "@tanstack/react-query";
import { getRepoReadmeWithFilenameAction, getRepoLicenseAction, getRepoLicenseTypeAction, getRepoContributingAction } from "@/actions/github.action";
import { useLanguage } from "@/utils/useLanguage";

function readmeKey(githubUrl: string) { return ["readme", githubUrl] as const; }
function licenseKey(githubUrl: string) { return ["license", githubUrl] as const; }
function contributingKey(githubUrl: string) { return ["contributing", githubUrl] as const; }

// Error types for README fetching
export type ReadmeErrorType = "NETWORK_ERROR" | "NOT_FOUND";

export interface ReadmeResult {
  content?: string;
  error?: ReadmeErrorType;
}

// Error types for CONTRIBUTING fetching
export type ContributingErrorType = "NETWORK_ERROR" | "NOT_FOUND";

export interface ContributingResult {
  content?: string;
  error?: ContributingErrorType;
}

const decodeGitHubContent = (base64String: string): string => {
  const binaryString = typeof atob !== "undefined" ? atob(base64String) : Buffer.from(base64String, "base64").toString("binary");
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(bytes);
};

export function useRepoReadme(githubUrl?: string | null) {
  const { language } = useLanguage();
  const preferChinese = language === "zh";
  
  return useQuery<ReadmeResult>({
    queryKey: githubUrl ? [...readmeKey(githubUrl), language] : ["readme", "none"],
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
              if (json.error && json.error !== "NOT_FOUND") {
                // If API returns error type (except NOT_FOUND), preserve it
                // NOT_FOUND means file doesn't exist, so we should fallback to default README
                return { error: json.error as ReadmeErrorType };
              }
              if (json.content && json.content !== "No README") {
                return { content: json.content as string };
              }
              // If json.error is "NOT_FOUND" or json.content is "No README", fall through to try default README
            } else if (res.status >= 500) {
              // Server error (5xx) indicates network/server issue
              return { error: "NETWORK_ERROR" };
            }
            // If res.ok is false but status < 500, fall through to try default README
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
          console.log(`⚠️ API request failed for ${githubUrl}, falling back to action`);
          try {
            const res = await getRepoReadmeWithFilenameAction(githubUrl);
            if (Array.isArray(res)) {
              console.warn(`⚠️ Action returned array instead of file for ${githubUrl}. This usually means the path points to a directory.`);
            }
            if (!res || Array.isArray(res) || !("content" in res) || !res.content) {
              console.log(`ℹ️ README not found via action for ${githubUrl}. res type: ${Array.isArray(res) ? "array" : res ? typeof res : "null"}`);
              return { content: "No README", error: "NOT_FOUND" };
            }
            return { content: decodeGitHubContent(res.content) };
          } catch (_actionError) {
            // Action failed - likely network error
            console.error(`❌ Action failed for ${githubUrl}:`, _actionError);
            return { error: "NETWORK_ERROR" };
          }
        }
      } catch (_error) {
        // Any other error is treated as network error
        return { error: "NETWORK_ERROR" };
      }
    },
    enabled: !!githubUrl,
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    refetchInterval: 12 * 60 * 60 * 1000,
  });
}

export function useRepoContributing(githubUrl?: string | null) {
  const { language } = useLanguage();
  const preferChinese = language === "zh";
  
  return useQuery<ContributingResult>({
    queryKey: githubUrl ? [...contributingKey(githubUrl), language] : ["contributing", "none"],
    queryFn: async () => {
      if (!githubUrl) return { content: "No CONTRIBUTING", error: "NOT_FOUND" };
      console.log("useRepoContributing", githubUrl, preferChinese);
      
      try {
        // If Chinese is preferred, try to get CONTRIBUTING.zh.md first
        if (preferChinese) {
          try {
            const res = await getRepoContributingAction(githubUrl, "CONTRIBUTING.zh.md");
            if (res && !Array.isArray(res) && "content" in res && res.content) {
              return { content: decodeGitHubContent(res.content) };
            }
            // If not found, fall through to try default CONTRIBUTING
          } catch (error) {
            // Check if it's a 404 (not found) error
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStatus = typeof error === "object" && error !== null && "status" in error ? (error as { status: number }).status : null;
            
            const isNotFound = 
              errorMessage.includes("404") ||
              errorStatus === 404;
            
            if (isNotFound) {
              // File doesn't exist, continue to fallback to default CONTRIBUTING
            } else {
              // Network or other error - log but continue to try default CONTRIBUTING
              console.warn(`⚠️ Error fetching CONTRIBUTING.zh.md for ${githubUrl}:`, error);
            }
            // Continue to fallback to default CONTRIBUTING
          }
        }
        
        // Try default CONTRIBUTING (either as fallback for Chinese or primary for non-Chinese)
        try {
          const res = await getRepoContributingAction(githubUrl);
          if (!res || Array.isArray(res) || !("content" in res) || !res.content) {
            console.log(`ℹ️ CONTRIBUTING not found for ${githubUrl}. res type: ${Array.isArray(res) ? "array" : res ? typeof res : "null"}`);
            return { content: "No CONTRIBUTING", error: "NOT_FOUND" };
          }
          return { content: decodeGitHubContent(res.content) };
        } catch (error) {
          // Log error details for debugging
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStatus = typeof error === "object" && error !== null && "status" in error ? (error as { status: number }).status : null;
          
          console.error(`❌ Error fetching CONTRIBUTING for ${githubUrl}:`, {
            message: errorMessage,
            status: errorStatus,
            error: error,
          });
          
          // Check if it's a GitHub API 404 (not found)
          const isNotFound = 
            errorMessage.includes("404") ||
            errorStatus === 404;
          
          if (isNotFound) {
            return { content: "No CONTRIBUTING", error: "NOT_FOUND" };
          }
          
          // Check for rate limit (403) or authentication issues
          if (errorStatus === 403 || errorMessage.includes("rate limit") || errorMessage.includes("403")) {
            console.warn(`⚠️ GitHub API rate limit or permission issue for ${githubUrl}`);
            return { error: "NETWORK_ERROR" };
          }
          
          // All other errors (network errors, 5xx, etc.) are treated as network errors
          return { error: "NETWORK_ERROR" };
        }
      } catch (_error) {
        // Any other error is treated as network error
        return { error: "NETWORK_ERROR" };
      }
    },
    enabled: !!githubUrl,
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
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
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    refetchInterval: 12 * 60 * 60 * 1000,
  });
}

