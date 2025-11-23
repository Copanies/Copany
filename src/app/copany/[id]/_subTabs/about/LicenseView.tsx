"use client";

import { Suspense } from "react";
import { useState, useEffect, useRef } from "react";
import { useCurrentUser } from "@/hooks/currentUser";
import { useRepoLicense } from "@/hooks/readme";
import { updateCopanyLicenseAction } from "@/actions/copany.actions";
import LoadingView from "@/components/commons/LoadingView";
import {
  ScaleIcon,
  ArrowUpRightIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import Button from "@/components/commons/Button";
import { Copany } from "@/types/database.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EMPTY_STRING } from "@/utils/constants";
import { useRouter } from "next/navigation";
import CoslLicenseTip from "@/components/copany/CoslLicenseTip";
import { generateCOSLLicense } from "@/utils/coslLicense";

/**
 * Generate a link to create a new LICENSE file from GitHub URL
 * @param githubUrl GitHub repository URL
 * @returns Link to create a new LICENSE file, or null if parsing fails
 */
const generateNewLicenseUrl = (githubUrl: string): string | null => {
  try {
    const url = new URL(githubUrl);
    const pathSegments = url.pathname.split("/").filter(Boolean);

    if (pathSegments.length >= 2) {
      const [owner, repo] = pathSegments;
      // Remove possible .git suffix
      const cleanRepo = repo.replace(/\.git$/, "");
      // Construct URL for creating a new LICENSE file
      const url = `https://github.com/${owner}/${cleanRepo}/new/main?filename=LICENSE`;
      return url;
    }
    return null;
  } catch (error) {
    console.error("Failed to generate new LICENSE URL:", error);
    return null;
  }
};

interface LicenseViewProps {
  githubUrl?: string | null;
  copany: Copany;
  onCopanyUpdate?: (copany: Copany) => void;
}

export default function LicenseView({ githubUrl, copany }: LicenseViewProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: currentUser } = useCurrentUser();
  const { data: licenseData, isLoading: isLicenseLoading } =
    useRepoLicense(githubUrl);

  const [licenseContent, setLicenseContent] = useState<string>(EMPTY_STRING);
  const [licenseType, setLicenseType] = useState<string | null>(copany.license);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // 使用 mutation 来更新 license
  const updateLicenseMutation = useMutation({
    mutationFn: async (licenseType: string) => {
      await updateCopanyLicenseAction(copany.id, licenseType);
      return licenseType;
    },
    onSuccess: (newLicenseType) => {
      setLicenseType(newLicenseType);
      queryClient.invalidateQueries({ queryKey: ["copany", copany.id] });
    },
  });

  const mutateRef = useRef(updateLicenseMutation.mutate);
  useEffect(() => {
    mutateRef.current = updateLicenseMutation.mutate;
  }, [updateLicenseMutation.mutate]);

  useEffect(() => {
    if (!licenseData) {
      setNotFound(true);
      setLicenseContent(EMPTY_STRING);
      return;
    }

    if (licenseData.content === "No License") {
      setNotFound(true);
      setLicenseContent(EMPTY_STRING);
      return;
    }

    try {
      setLicenseContent(licenseData.content);
      setNotFound(false);
      setError(null);
    } catch (_err) {
      setError("Failed to decode License content");
      setLicenseContent(EMPTY_STRING);
    }
  }, [licenseData]);

  useEffect(() => {
    if (!githubUrl || !licenseData || licenseData.content === "No License")
      return;

    if (licenseData.type && licenseData.type !== licenseType) {
      console.log(
        `📝 License type changed: ${licenseType} -> ${licenseData.type}`
      );
      mutateRef.current(licenseData.type);
    }
  }, [githubUrl, licenseData, licenseType]);

  if (isLicenseLoading) {
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
    const isOwner = currentUser?.id === copany.created_by;

    // If copany is set to use COSL by default and the GitHub license can't be found, display the generated COSL license
    if (copany.isDefaultUseCOSL) {
      const coslLicenseContent = generateCOSLLicense(copany.name);
      const newLicenseUrl = githubUrl ? generateNewLicenseUrl(githubUrl) : null;

      return (
        <div className="space-y-4">
          {/* GitHub LICENSE submission tip */}
          {githubUrl && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4">
              <div className="flex flex-row gap-2">
                <div className="flex items-center justify-center h-6">
                  <InformationCircleIcon
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    strokeWidth={2}
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Recommend submitting LICENSE file to GitHub
                  </p>
                  <p className="text-base text-gray-800 dark:text-gray-200">
                    To ensure the authority and visibility of the license, we
                    recommend submitting the following LICENSE file to the root
                    directory of your GitHub repository&apos;s main branch.
                  </p>
                  {newLicenseUrl && (
                    <div className="flex -ml-2">
                      <Button
                        variant="ghost"
                        size="md"
                        className="!w-fit !text-nowrap hover:!bg-blue-100 dark:hover:!bg-blue-900/20"
                        onClick={() => {
                          // Copy LICENSE content to clipboard
                          navigator.clipboard
                            .writeText(coslLicenseContent)
                            .then(() => {
                              // Open GitHub create LICENSE page after copying successfully
                              window.open(newLicenseUrl, "_blank");
                            })
                            .catch((err) => {
                              console.error(
                                "Failed to copy LICENSE content:",
                                err
                              );
                              // Open GitHub page even if copying fails
                              window.open(newLicenseUrl, "_blank");
                            });
                        }}
                      >
                        <div className="flex flex-row items-center gap-2">
                          <ArrowUpRightIcon
                            className="w-4 h-4"
                            strokeWidth={2}
                          />
                          <p className="!text-nowrap">
                            Copy and Add LICENSE to GitHub
                          </p>
                        </div>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <pre className="whitespace-pre-wrap break-words font-mono text-sm rounded-lg">
            {coslLicenseContent}
          </pre>
        </div>
      );
    }

    return (
      <EmptyPlaceholderView
        icon={
          <ScaleIcon
            className="w-16 h-16 text-gray-500 dark:text-gray-400"
            strokeWidth={1}
          />
        }
        titleKey="addLicense"
        descriptionKey={
          isOwner
            ? "addLicenseDesc"
            : "addLicenseDescNotOwner"
        }
        buttonIcon={
          isOwner ? <ArrowUpRightIcon className="w-4 h-4" /> : undefined
        }
        buttonTitleKey={
          isOwner ? "howToUseCoslLicense" : undefined
        }
        buttonAction={() => router.push("/uselicense")}
      />
    );
  }

  const isOwner = currentUser?.id === copany.created_by;

  return (
    <div className="space-y-4">
      {licenseType !== "COSL" && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <CoslLicenseTip isOwner={isOwner} />
        </div>
      )}
      <Suspense
        fallback={
          <LoadingView type="label" label="Loading license content..." />
        }
      >
        <pre className="whitespace-pre-wrap break-words font-mono text-sm rounded-lg">
          {licenseContent}
        </pre>
      </Suspense>
    </div>
  );
}
