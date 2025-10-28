"use client";

import { updateCopanyAction } from "@/actions/copany.actions";
import Button from "@/components/commons/Button";
import { Copany } from "@/types/database.types";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import Modal from "@/components/commons/Modal";
import Dropdown from "@/components/commons/Dropdown";
import { useDarkMode } from "@/utils/useDarkMode";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EMPTY_STRING } from "@/utils/constants";
import GitHubRepoSelector from "@/components/github/GitHubRepoSelector";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";

export default function AssetLinkModal({
  isOpen,
  onClose,
  assetLinks,
  copany,
  editingAssetLink,
  onCopanyUpdate,
  forceGithubType = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  assetLinks: {
    key: string;
    label: string;
    value: string | null;
    icon: string;
    darkIcon: string;
    id: number;
  }[];
  copany: Copany;
  editingAssetLink?: {
    type: number;
    currentValue: string;
  } | null;
  onCopanyUpdate: (copany: Copany) => void;
  forceGithubType?: boolean;
}) {
  const [assetType, setAssetType] = useState<number | null>(null);
  const [assetLink, setAssetLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isEditMode = !!editingAssetLink;
  const isDarkMode = useDarkMode();
  const queryClient = useQueryClient();

  // React Query mutation for updating copany asset links
  const updateCopanyAssetLinkMutation = useMutation({
    mutationFn: updateCopanyAction,
    onSuccess: (updatedCopany) => {
      // update local state
      onCopanyUpdate(updatedCopany);

      // invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["copany", copany.id] });
      queryClient.invalidateQueries({ queryKey: ["copanies"] });

      // set query data to keep UI in sync - use the correct query key
      queryClient.setQueryData(["copany", copany.id], updatedCopany);

      // reset state and close modal
      setAssetType(null);
      setAssetLink(null);
      onClose();
    },
    onError: (error) => {
      console.error("Failed to update copany asset link:", error);
    },
  });

  // stable mutation method
  const mutateAsyncRef = useRef(updateCopanyAssetLinkMutation.mutateAsync);

  // sync the latest function in the ref
  if (updateCopanyAssetLinkMutation.mutateAsync !== mutateAsyncRef.current) {
    mutateAsyncRef.current = updateCopanyAssetLinkMutation.mutateAsync;
  }

  // when the modal is opened, set the initial values
  useEffect(() => {
    if (isOpen && editingAssetLink) {
      setAssetType(editingAssetLink.type);
      setAssetLink(editingAssetLink.currentValue);
    } else if (isOpen && !editingAssetLink) {
      if (forceGithubType) {
        setAssetType(1); // GitHub type
        setAssetLink(null);
      } else {
        setAssetType(null);
        setAssetLink(null);
      }
    }
  }, [isOpen, editingAssetLink, forceGithubType]);

  // extract repository information from GitHub URL
  const extractRepoInfoFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === "github.com") {
        const pathParts = urlObj.pathname.split("/").filter((part) => part);
        if (pathParts.length >= 2) {
          return {
            owner: pathParts[0],
            repo: pathParts[1],
            fullName: `${pathParts[0]}/${pathParts[1]}`,
          };
        }
      }
    } catch (error) {
      console.error("Failed to parse GitHub URL:", error);
    }
    return null;
  };

  // get the default selected repository ID (for edit mode)
  const getDefaultSelectedRepoId = () => {
    if (isEditMode && editingAssetLink && editingAssetLink.type === 1) {
      const repoInfo = extractRepoInfoFromUrl(editingAssetLink.currentValue);
      if (repoInfo) {
        return copany.github_repository_id;
      }
    }
    return copany.github_repository_id;
  };

  // stable repository selection callback
  const handleRepoSelect = useCallback(
    (
      repo: {
        id: number;
        name: string;
        full_name: string;
        html_url: string;
        description: string | null;
        owner: {
          avatar_url: string;
          login: string;
          type: string;
        };
      } | null
    ) => {
      if (repo) {
        setAssetLink(repo.html_url);
      } else {
        setAssetLink(null);
      }
    },
    []
  );

  async function updateCopanyAssetLinkAction(
    assetType: number,
    assetLink: string
  ) {
    setIsLoading(true);
    try {
      const assetLinkItem = assetLinks.find((link) => link.id === assetType);
      if (!assetLinkItem?.key) {
        console.error("Invalid asset type:", assetType);
        return;
      }

      const updatedCopany = {
        ...copany,
        [assetLinkItem.key]: assetLink,
      };
      await mutateAsyncRef.current(updatedCopany);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setAssetType(null);
        setAssetLink(null);
        onClose();
      }}
    >
      <div className="flex flex-col gap-5">
        <h1 className="text-lg font-bold px-8 pt-8">
          {isEditMode ? "Edit asset link" : "Add asset link"}
        </h1>
        <div className="flex flex-col gap-3 px-8">
          <p className="text-base">Asset type</p>
          {forceGithubType ? (
            <div className="w-full flex flex-row gap-2 items-center border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-800">
              <Image
                src={
                  isDarkMode
                    ? assetLinks.find((link) => link.id === 1)?.darkIcon || ""
                    : assetLinks.find((link) => link.id === 1)?.icon || ""
                }
                alt={assetLinks.find((link) => link.id === 1)?.label || ""}
                className="w-5 h-5 flex-shrink-0"
                width={20}
                height={20}
                placeholder="blur"
                blurDataURL={shimmerDataUrlWithTheme(20, 20, isDarkMode)}
              />
              <p className="text-base flex-1 text-left">
                {assetLinks.find((link) => link.id === 1)?.label || ""}
              </p>
            </div>
          ) : isEditMode && assetType !== null ? (
            <div className="w-full flex flex-row gap-2 items-center border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-800">
              <Image
                src={
                  isDarkMode
                    ? assetLinks.find((link) => link.id === assetType)
                        ?.darkIcon || ""
                    : assetLinks.find((link) => link.id === assetType)?.icon ||
                      ""
                }
                alt={
                  assetLinks.find((link) => link.id === assetType)?.label || ""
                }
                className="w-5 h-5 flex-shrink-0"
                width={20}
                height={20}
              />
              <p className="text-base flex-1 text-left">
                {assetLinks.find((link) => link.id === assetType)?.label || ""}
              </p>
            </div>
          ) : (
            <Dropdown
              className="w-full"
              showBorder={true}
              showBackground={false}
              marginX={0}
              options={assetLinks
                .filter((link) => {
                  const value = copany[link.key as keyof Copany];
                  return value === null;
                })
                .map((link) => {
                  return {
                    value: Number(link.id),
                    label: (
                      <div className="flex flex-row gap-2 items-center">
                        <Image
                          src={isDarkMode ? link.darkIcon : link.icon}
                          alt={link.label || ""}
                          className="w-5 h-5"
                          width={20}
                          height={20}
                          placeholder="blur"
                          blurDataURL={shimmerDataUrlWithTheme(
                            20,
                            20,
                            isDarkMode
                          )}
                        />
                        <label className="text-base">{link.label}</label>
                      </div>
                    ),
                  };
                })}
              onSelect={(value) => {
                setAssetType(value);
              }}
              selectedValue={assetType ? Number(assetType) : null}
              trigger={
                assetType ? (
                  <div className="w-full flex flex-row gap-2 items-center">
                    <Image
                      src={
                        isDarkMode
                          ? assetLinks.find((link) => link.id === assetType)
                              ?.darkIcon || ""
                          : assetLinks.find((link) => link.id === assetType)
                              ?.icon || ""
                      }
                      alt={
                        assetLinks.find((link) => link.id === assetType)
                          ?.label || ""
                      }
                      className="w-5 h-5 flex-shrink-0"
                      width={20}
                      height={20}
                      placeholder="blur"
                      blurDataURL={shimmerDataUrlWithTheme(20, 20, isDarkMode)}
                    />
                    <label
                      htmlFor="assetType"
                      className="text-base text-left cursor-pointer flex-1"
                    >
                      {assetLinks.find((link) => link.id === assetType)?.label}
                    </label>
                    <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
                  </div>
                ) : (
                  <div className="w-full flex flex-row gap-2 items-center">
                    <label className="text-base text-gray-500 cursor-pointer text-left flex-1">
                      Select asset type
                    </label>
                    <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
                  </div>
                )
              }
            />
          )}
          <p className="text-base">Asset link</p>

          {/* GitHub repository selector */}
          {assetType === 1 || forceGithubType ? (
            <GitHubRepoSelector
              onRepoSelect={handleRepoSelect}
              defaultSelectedRepoId={getDefaultSelectedRepoId()}
              defaultSelectedRepoUrl={
                isEditMode && editingAssetLink?.type === 1
                  ? editingAssetLink.currentValue
                  : null
              }
              showLabel={false}
              disabled={isLoading}
            />
          ) : (
            /* manual input box - display when not GitHub type */
            <input
              type="text"
              id="assetLink"
              className="text-base border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2"
              placeholder="https://example.com"
              value={assetLink || EMPTY_STRING}
              onChange={(e) => {
                setAssetLink(e.target.value);
              }}
            />
          )}
        </div>
        <div className="flex flex-row gap-2 justify-end px-8 pb-8">
          <Button
            variant="secondary"
            onClick={() => {
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={
              (assetType === null && !forceGithubType) ||
              !assetLink ||
              isLoading
            }
            onClick={() => {
              const currentAssetType = forceGithubType ? 1 : assetType;
              if (currentAssetType !== null) {
                updateCopanyAssetLinkAction(currentAssetType, assetLink || "");
              }
            }}
          >
            {isLoading
              ? isEditMode
                ? "Updating link..."
                : "Adding link..."
              : isEditMode
              ? "Update link"
              : "Add link"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
