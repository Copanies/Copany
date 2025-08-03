"use client";

import { useState, useEffect } from "react";
import { currentUserManager, licenseManager } from "@/utils/cache";
import { getRepoLicenseAction } from "@/actions/github.action";
import LoadingView from "@/components/commons/LoadingView";
import { ScaleIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";

interface LicenseViewProps {
  githubUrl?: string | null;
}

const decodeGitHubContent = (base64String: string): string => {
  try {
    const binaryString = atob(base64String);
    const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(bytes);
  } catch (error) {
    console.error("Failed to decode GitHub content:", error);
    throw new Error("Failed to decode GitHub content");
  }
};

/**
 * Generate a link to create a new License file from GitHub URL
 * @param githubUrl GitHub repository URL
 * @returns Link to create a new License file, or null if parsing fails
 */
const generateNewLicenseUrl = (githubUrl: string): string | null => {
  try {
    const url = new URL(githubUrl);
    const pathSegments = url.pathname.split("/").filter(Boolean);

    if (pathSegments.length >= 2) {
      const [owner, repo] = pathSegments;
      // Remove possible .git suffix
      const cleanRepo = repo.replace(/\.git$/, "");
      // Construct URL for creating a new License file
      return `https://github.com/${owner}/${cleanRepo}/community/license/new`;
    }
    return null;
  } catch (error) {
    console.error("Failed to generate new License URL:", error);
    return null;
  }
};

export default function LicenseView({ githubUrl }: LicenseViewProps) {
  const [licenseContent, setLicenseContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    console.log("LicenseView mounted, starting to fetch License");

    const fetchLicense = async () => {
      try {
        setError(null);
        setNotFound(false);

        // Check if user is logged in, but don't prevent non-logged in users from viewing public repository License
        const user = await currentUserManager.getCurrentUser();
        setIsLoggedIn(!!user);

        if (!githubUrl) {
          setLicenseContent("No repository information found");
          return;
        }

        // First check if there's a cache, only show loading when network request is needed
        const cachedContent = licenseManager.getCachedLicense(githubUrl);

        if (cachedContent) {
          // Cache exists, immediately display cached content without showing loading
          if (cachedContent === "No License") {
            setNotFound(true);
            setLicenseContent("");
          } else {
            setLicenseContent(cachedContent);
          }

          // Refresh cache in background without showing loading
          licenseManager
            .getLicense(githubUrl, async () => {
              const license = await getRepoLicenseAction(githubUrl);
              if (
                !license ||
                Array.isArray(license) ||
                !("content" in license)
              ) {
                return "No License";
              }
              return decodeGitHubContent(license.content);
            })
            .then((freshContent) => {
              // Only update UI when content has changed
              if (freshContent !== cachedContent) {
                if (freshContent === "No License") {
                  setNotFound(true);
                  setLicenseContent("");
                } else {
                  setNotFound(false);
                  setLicenseContent(freshContent);
                }
              }
            })
            .catch((error) => {
              console.warn("Background refresh License failed:", error);
            });
        } else {
          // No cache, network request needed, show loading
          setLoading(true);
          try {
            const content = await licenseManager.getLicense(
              githubUrl,
              async () => {
                const license = await getRepoLicenseAction(githubUrl);
                if (
                  !license ||
                  Array.isArray(license) ||
                  !("content" in license)
                ) {
                  return "No License";
                }
                return decodeGitHubContent(license.content);
              }
            );

            if (content === "No License") {
              setNotFound(true);
              setLicenseContent("");
            } else {
              setLicenseContent(content);
            }
          } finally {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Failed to get License:", err);

        const errorMessage = "Failed to get License content.";
        setError(errorMessage);
        setLicenseContent("");
      }
    };

    fetchLicense();
  }, [githubUrl]);

  if (loading) {
    return (
      <div className="py-8 text-center">
        <LoadingView type="label" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (notFound) {
    const newLicenseUrl = githubUrl ? generateNewLicenseUrl(githubUrl) : null;

    return (
      <EmptyPlaceholderView
        icon={
          <ScaleIcon
            className="w-16 h-16 text-gray-500 dark:text-gray-400"
            strokeWidth={1}
          />
        }
        title="Add License"
        description={
          isLoggedIn
            ? "Help protect your Copany by adding a License — choose how others can use, modify, and distribute your work."
            : "This repository does not have a License yet. Log in to add a License file."
        }
        buttonIcon={
          isLoggedIn ? <ArrowUpRightIcon className="w-4 h-4" /> : undefined
        }
        buttonTitle={isLoggedIn ? "Add License" : undefined}
        buttonAction={
          isLoggedIn && newLicenseUrl
            ? () => window.open(newLicenseUrl, "_blank")
            : undefined
        }
      />
    );
  }

  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-sm p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
      {licenseContent}
    </pre>
  );
}
