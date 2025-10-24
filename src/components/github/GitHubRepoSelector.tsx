"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useDarkMode } from "@/utils/useDarkMode";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import {
  ChevronDownIcon,
  CubeTransparentIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
import githubIconBlack from "@/assets/github_logo.svg";
import githubIconWhite from "@/assets/github_logo_dark.svg";
import { getOrgAndReposAction } from "@/actions/github.action";
import { RestEndpointMethodTypes } from "@octokit/rest";
import Button from "@/components/commons/Button";
import LoadingView from "@/components/commons/LoadingView";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { EMPTY_ARRAY } from "@/utils/constants";
import { useHasProviders } from "@/hooks/userAuth";
import { signInWithGitHub } from "@/actions/auth.actions";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

interface GitHubRepoSelectorProps {
  onRepoSelect: (
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
  ) => void;
  defaultSelectedRepoId?: string | null;
  defaultSelectedRepoUrl?: string | null;
  disabled?: boolean;
  className?: string;
}

export default function GitHubRepoSelector({
  onRepoSelect,
  defaultSelectedRepoId,
  defaultSelectedRepoUrl,
  disabled = false,
  className = "",
}: GitHubRepoSelectorProps) {
  const queryClient = useQueryClient();
  const isDarkMode = useDarkMode();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const onRepoSelectRef = useRef(onRepoSelect);

  // sync the latest callback function in the ref
  useEffect(() => {
    onRepoSelectRef.current = onRepoSelect;
  }, [onRepoSelect]);

  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isGitHubBinding, setIsGitHubBinding] = useState(false);
  const [repoData, setRepoData] = useState<{
    success: boolean;
    data?: RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"];
    error?: string;
  } | null>(null);
  const [repoError, setRepoError] = useState<Error | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [shouldShowDropdown, setShouldShowDropdown] = useState(false);

  // Check GitHub binding status
  const { data: providersInfo, isLoading: providersLoading } =
    useHasProviders();
  const hasGitHub = providersInfo?.hasGitHub || false;

  // check if there is an authentication error
  const hasAuthError = () => {
    const errorMessage = repoError?.message || repoData?.error || "";
    return (
      errorMessage.includes("Bad credentials") ||
      errorMessage.includes("401") ||
      errorMessage.includes("Unauthorized") ||
      errorMessage.includes("authentication failed") ||
      errorMessage.includes("GitHub authentication required")
    );
  };

  // calculate dropdown menu position
  const calculateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = buttonRect.width;
    const maxHeight = 400; // max-h-100 corresponding pixel value

    // get the actual height
    const actualHeight = dropdownContentRef.current?.offsetHeight;
    const effectiveHeight = actualHeight
      ? Math.min(actualHeight, maxHeight)
      : maxHeight;

    // if there is no actual height, do not display the dropdown menu
    if (!actualHeight) {
      setShouldShowDropdown(false);
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // use relative to viewport coordinates, add 8px safe margin
    const safeMargin = 8;
    let top = buttonRect.bottom + safeMargin;
    let left = buttonRect.left;

    // check if it can be displayed below (consider safe margin)
    const canShowBelow =
      buttonRect.bottom + safeMargin + effectiveHeight <=
      viewportHeight - safeMargin;
    const canShowLeftAligned =
      buttonRect.left + dropdownWidth <= viewportWidth - safeMargin;

    if (canShowBelow) {
      // display below
      top = buttonRect.bottom + safeMargin;
      if (canShowLeftAligned) {
        left = buttonRect.left;
      } else {
        // right align
        left = buttonRect.right - dropdownWidth;
        // 确保不超出右边界
        if (left < safeMargin) {
          left = safeMargin;
        }
      }
    } else {
      // display above
      top = buttonRect.top - effectiveHeight - safeMargin;
      if (canShowLeftAligned) {
        left = buttonRect.left;
      } else {
        left = buttonRect.right - dropdownWidth;
        // ensure not to exceed the right boundary
        if (left < safeMargin) {
          left = safeMargin;
        }
      }
    }

    // ensure not to exceed the left boundary
    if (left < safeMargin) {
      left = safeMargin;
    }

    setDropdownPosition({ top, left, width: dropdownWidth });
    setShouldShowDropdown(true);
  }, []);

  // get repository data function
  const fetchRepos = useCallback(async () => {
    if (!hasGitHub) return;

    setIsLoadingRepos(true);
    setRepoError(null);

    try {
      const result = await getOrgAndReposAction();
      setRepoData(result);
    } catch (error) {
      setRepoError(error as Error);
    } finally {
      setIsLoadingRepos(false);
    }
  }, [hasGitHub]);

  // when the conditions are met, automatically fetch repository data
  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  // set the default selected repository
  useEffect(() => {
    if (repoData?.success && repoData?.data) {
      let selectedRepo = null;

      console.log(
        "GitHubRepoSelector: Attempting to set default selected repository"
      );
      console.log("defaultSelectedRepoUrl:", defaultSelectedRepoUrl);
      console.log("defaultSelectedRepoId:", defaultSelectedRepoId);
      console.log("repoData.data length:", repoData.data.length);

      // prioritize matching by URL (for edit mode)
      if (defaultSelectedRepoUrl) {
        console.log("Attempting to match by URL:", defaultSelectedRepoUrl);
        selectedRepo = repoData.data.find(
          (r) => r.html_url === defaultSelectedRepoUrl
        );
        console.log("URL matching result:", selectedRepo);
      }

      // if URL matching fails, try matching by ID
      if (!selectedRepo && defaultSelectedRepoId) {
        const repoId = parseInt(defaultSelectedRepoId);
        console.log("Attempting to match by ID:", repoId);
        selectedRepo = repoData.data.find((r) => r.id === repoId);
        console.log("ID matching result:", selectedRepo);
      }

      if (selectedRepo) {
        console.log("Setting selected repository:", selectedRepo);
        setSelectedRepoId(selectedRepo.id);
        onRepoSelectRef.current(selectedRepo);
      } else {
        console.log("No matching repository found");
      }
    }
  }, [defaultSelectedRepoId, defaultSelectedRepoUrl, repoData]);

  // click outside to close dropdown menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        event.stopPropagation();
        event.preventDefault();
        setIsDropdownOpen(false);
        setShouldShowDropdown(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("click", handleClickOutside, true);
      return () => {
        document.removeEventListener("click", handleClickOutside, true);
      };
    }
  }, [isDropdownOpen]);

  // when the dropdown menu is opened, calculate the position
  useEffect(() => {
    if (isDropdownOpen) {
      setShouldShowDropdown(false);

      // delay one frame to ensure the DOM is rendered, then calculate the position
      requestAnimationFrame(() => {
        calculateDropdownPosition();
      });

      // listen to window size change and scroll event
      const handleResize = () => calculateDropdownPosition();
      const handleScroll = () => calculateDropdownPosition();

      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleScroll);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll);
      };
    } else {
      setShouldShowDropdown(false);
    }
  }, [isDropdownOpen, calculateDropdownPosition]);

  // get the selected repository
  const getSelectedRepo = () => {
    if (!selectedRepoId || !repoData?.success || !repoData?.data) return null;
    return repoData.data.find(
      (
        repo: RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"][0]
      ) => repo.id === selectedRepoId
    );
  };

  // handle repository selection
  const handleRepoSelection = (repoId: number) => {
    setSelectedRepoId(repoId);
    setIsDropdownOpen(false);

    const repo =
      repoData?.success && repoData?.data
        ? repoData.data.find(
            (
              r: RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"][0]
            ) => r.id === repoId
          )
        : null;

    if (repo) {
      onRepoSelect(repo);
    }
  };

  // GitHub binding handler
  const handleBindGitHub = async () => {
    setIsGitHubBinding(true);
    try {
      await signInWithGitHub();
    } catch (error) {
      console.error("GitHub binding failed:", error);
      setIsGitHubBinding(false);
    }
  };

  // GitHub re-binding handler (when token is invalid)
  const handleRebindGitHub = async () => {
    setIsGitHubBinding(true);
    try {
      await signInWithGitHub();
      await queryClient.invalidateQueries({ queryKey: ["userAuth"] });
      await fetchRepos();
    } catch (error) {
      console.error("GitHub rebinding failed:", error);
    } finally {
      setIsGitHubBinding(false);
    }
  };

  // manually retry to fetch repository data
  const handleRetryFetch = async () => {
    try {
      await fetchRepos();
    } catch (error) {
      console.error("Manual retry failed:", error);
    }
  };

  // get the display information of the selected repository
  const getSelectedRepoDisplay = () => {
    const repo = getSelectedRepo();
    if (!repo) return null;

    return {
      avatarUrl: repo.owner.avatar_url,
      fullName: repo.full_name,
      name: repo.name,
      ownerType: repo.owner.type,
    };
  };

  // if the providers information is loading, display the loading state
  if (providersLoading) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 w-full text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 ${className}`}
      >
        <LoadingView type="label" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-start gap-3 w-full ${className}`}>
      <label
        htmlFor="github-repo"
        className="text-sm font-normal text-gray-900 dark:text-gray-100"
      >
        Select GitHub repository
      </label>

      <div className="flex items-center gap-2.5 w-full">
        <div className="relative flex-1" ref={dropdownRef}>
          {hasGitHub ? (
            <>
              <button
                ref={buttonRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasAuthError() && !disabled) {
                    setIsDropdownOpen(!isDropdownOpen);
                  }
                }}
                disabled={hasAuthError() || disabled}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 w-full justify-between text-base ${
                  hasAuthError() || disabled
                    ? "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                }`}
              >
                {getSelectedRepoDisplay() ? (
                  <div className="flex items-center gap-2">
                    <Image
                      src={getSelectedRepoDisplay()!.avatarUrl}
                      alt="Repository Owner Avatar"
                      width={20}
                      height={20}
                      className="rounded-sm w-5 h-5"
                      placeholder="blur"
                      blurDataURL={shimmerDataUrlWithTheme(20, 20, isDarkMode)}
                    />
                    <span>{getSelectedRepoDisplay()!.fullName}</span>
                  </div>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">
                    Select repository
                  </span>
                )}

                <ChevronDownIcon
                  className={`w-4 h-4 text-gray-900 dark:text-gray-100 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isDropdownOpen && (
                <>
                  {/* hidden DOM element used to calculate height */}
                  <div
                    ref={dropdownContentRef}
                    className="fixed invisible bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-100 overflow-y-auto"
                    style={{
                      top: "-9999px",
                      left: "-9999px",
                      width: dropdownPosition.width,
                    }}
                  >
                    {isLoadingRepos && (
                      <div className="py-8">
                        <LoadingView type="label" delay={500} />
                      </div>
                    )}
                    {(repoError || (repoData && !repoData?.success)) && (
                      <div className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        <div className="flex flex-col gap-2">
                          <span>
                            {repoError?.message ||
                              repoData?.error ||
                              "Failed to load repositories"}
                          </span>
                          {(() => {
                            const errorMessage =
                              repoError?.message || repoData?.error || "";
                            const isAuthError =
                              errorMessage.includes("Bad credentials") ||
                              errorMessage.includes("401") ||
                              errorMessage.includes("Unauthorized") ||
                              errorMessage.includes("authentication failed") ||
                              errorMessage.includes(
                                "GitHub authentication required"
                              );

                            if (isAuthError) {
                              return (
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  Please reconnect your GitHub account below.
                                </span>
                              );
                            }

                            return (
                              <div className="flex flex-col gap-2 mt-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  This might be a temporary issue. You can try
                                  again.
                                </span>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleRetryFetch}
                                >
                                  <span>Try Again</span>
                                </Button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    {!isLoadingRepos &&
                      !repoError &&
                      repoData?.success &&
                      !repoData?.data && (
                        <div className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          No repository data available
                        </div>
                      )}
                    {!isLoadingRepos &&
                      !repoError &&
                      repoData?.success &&
                      repoData?.data &&
                      (repoData.data || EMPTY_ARRAY).length === 0 && (
                        <div className="p-4">
                          <EmptyPlaceholderView
                            icon={
                              <CubeTransparentIcon
                                className="w-12 h-12 text-gray-500 dark:text-gray-400"
                                strokeWidth={1}
                              />
                            }
                            title={`@${
                              providersInfo?.providersData.find(
                                (p) => p.provider === "github"
                              )?.user_name
                            } has no available public repositories`}
                            description="You need at least one public repository to create a Copany. Go to GitHub to create a new public repository to get started."
                            buttonTitle="Create GitHub Repository"
                            buttonIcon={
                              <ArrowUpRightIcon className="w-4 h-4" />
                            }
                            buttonAction={() =>
                              window.open("https://github.com/new", "_blank")
                            }
                            size="md"
                          />
                        </div>
                      )}
                    {!isLoadingRepos &&
                      !repoError &&
                      repoData?.success &&
                      repoData?.data &&
                      (repoData.data || EMPTY_ARRAY).length > 0 && (
                        <>
                          {(repoData.data || EMPTY_ARRAY).map(
                            (
                              repo: RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"][0]
                            ) => (
                              <div
                                key={repo.id}
                                className="flex items-center gap-2 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRepoSelection(repo.id);
                                }}
                              >
                                <Image
                                  src={repo.owner.avatar_url}
                                  alt={`${repo.owner.login} Avatar`}
                                  width={24}
                                  height={24}
                                  className="w-6 h-6 rounded-sm"
                                  placeholder="blur"
                                  blurDataURL={shimmerDataUrlWithTheme(
                                    24,
                                    24,
                                    isDarkMode
                                  )}
                                />
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {repo.full_name}
                                  </span>
                                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {repo.description || "No description"}
                                  </span>
                                </div>
                              </div>
                            )
                          )}
                        </>
                      )}
                  </div>

                  {/* actual displayed dropdown menu */}
                  {shouldShowDropdown && (
                    <div
                      className="fixed z-[60] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-100 overflow-y-auto"
                      style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isLoadingRepos && (
                        <div className="py-8">
                          <LoadingView type="label" delay={500} />
                        </div>
                      )}
                      {(repoError || (repoData && !repoData?.success)) && (
                        <div className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          <div className="flex flex-col gap-2">
                            <span>
                              {repoError?.message ||
                                repoData?.error ||
                                "Failed to load repositories"}
                            </span>
                            {(() => {
                              const errorMessage =
                                repoError?.message || repoData?.error || "";
                              const isAuthError =
                                errorMessage.includes("Bad credentials") ||
                                errorMessage.includes("401") ||
                                errorMessage.includes("Unauthorized") ||
                                errorMessage.includes(
                                  "authentication failed"
                                ) ||
                                errorMessage.includes(
                                  "GitHub authentication required"
                                );

                              if (isAuthError) {
                                return (
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Please reconnect your GitHub account below.
                                  </span>
                                );
                              }

                              return (
                                <div className="flex flex-col gap-2 mt-2">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    This might be a temporary issue. You can try
                                    again.
                                  </span>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleRetryFetch}
                                  >
                                    <span>Try Again</span>
                                  </Button>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                      {!isLoadingRepos &&
                        !repoError &&
                        repoData?.success &&
                        !repoData?.data && (
                          <div className="px-4 py-3 text-gray-500 dark:text-gray-400">
                            No repository data available
                          </div>
                        )}
                      {!isLoadingRepos &&
                        !repoError &&
                        repoData?.success &&
                        repoData?.data &&
                        (repoData.data || EMPTY_ARRAY).length === 0 && (
                          <div className="p-4">
                            <EmptyPlaceholderView
                              icon={
                                <CubeTransparentIcon
                                  className="w-12 h-12 text-gray-500 dark:text-gray-400"
                                  strokeWidth={1}
                                />
                              }
                              title={`@${
                                providersInfo?.providersData.find(
                                  (p) => p.provider === "github"
                                )?.user_name
                              } has no available public repositories`}
                              description="You need at least one public repository to create a Copany. Go to GitHub to create a new public repository to get started."
                              buttonTitle="Create GitHub Repository"
                              buttonIcon={
                                <ArrowUpRightIcon className="w-4 h-4" />
                              }
                              buttonAction={() =>
                                window.open("https://github.com/new", "_blank")
                              }
                              size="md"
                            />
                          </div>
                        )}
                      {!isLoadingRepos &&
                        !repoError &&
                        repoData?.success &&
                        repoData?.data &&
                        (repoData.data || EMPTY_ARRAY).length > 0 && (
                          <>
                            {(repoData.data || EMPTY_ARRAY).map(
                              (
                                repo: RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"][0]
                              ) => (
                                <div
                                  key={repo.id}
                                  className="flex items-center gap-2 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRepoSelection(repo.id);
                                  }}
                                >
                                  <Image
                                    src={repo.owner.avatar_url}
                                    alt={`${repo.owner.login} Avatar`}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 rounded-sm"
                                    placeholder="blur"
                                    blurDataURL={shimmerDataUrlWithTheme(
                                      24,
                                      24,
                                      isDarkMode
                                    )}
                                  />
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {repo.full_name}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                      {repo.description || "No description"}
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </>
                        )}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 w-full text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
              <span>Please connect with GitHub first</span>
            </div>
          )}
        </div>
      </div>

      {hasGitHub ? (
        hasAuthError() ? (
          <button
            type="button"
            onClick={handleRebindGitHub}
            disabled={isGitHubBinding}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-800 dark:bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Image
              src={isDarkMode ? githubIconBlack : githubIconWhite}
              alt="GitHub Logo"
              className="w-4 h-4"
              width={16}
              height={16}
              placeholder="blur"
              blurDataURL={shimmerDataUrlWithTheme(16, 16, isDarkMode)}
            />

            <span className="text-sm font-semibold text-white dark:text-gray-900 whitespace-nowrap">
              {isGitHubBinding
                ? "Reconnecting..."
                : `Reconnect to @${
                    providersInfo?.providersData.find(
                      (p) => p.provider === "github"
                    )?.user_name
                  }`}
            </span>
          </button>
        ) : (
          <div className="flex flex-row items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <Image
              src={isDarkMode ? githubIconWhite : githubIconBlack}
              alt="GitHub Logo"
              className="w-4 h-4"
              width={16}
              height={16}
              placeholder="blur"
              blurDataURL={shimmerDataUrlWithTheme(16, 16, isDarkMode)}
            />
            <p>Connected</p>
            <Link
              href={`https://github.com/${
                providersInfo?.providersData.find(
                  (p) => p.provider === "github"
                )?.user_name
              }`}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:underline"
            >
              @
              {
                providersInfo?.providersData.find(
                  (p) => p.provider === "github"
                )?.user_name
              }
            </Link>
          </div>
        )
      ) : (
        <button
          type="button"
          onClick={handleBindGitHub}
          disabled={hasGitHub || isGitHubBinding}
          className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-800 dark:bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Image
            src={isDarkMode ? githubIconBlack : githubIconWhite}
            alt="GitHub Logo"
            className="w-4 h-4"
            width={16}
            height={16}
            placeholder="blur"
            blurDataURL={shimmerDataUrlWithTheme(16, 16, isDarkMode)}
          />

          <span className="text-sm font-semibold text-white dark:text-gray-900 whitespace-nowrap">
            {isGitHubBinding
              ? "Binding..."
              : hasGitHub
              ? `Connected @${
                  providersInfo?.providersData.find(
                    (p) => p.provider === "github"
                  )?.user_name
                }`
              : "Connect with GitHub"}
          </span>
        </button>
      )}
    </div>
  );
}
