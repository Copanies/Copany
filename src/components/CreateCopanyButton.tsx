"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  createCopanyAction,
  getOrgAndReposAction,
} from "@/actions/copany.actions";
import { RestEndpointMethodTypes } from "@octokit/rest";
import Button from "./commons/Button";
import LoadingView from "./commons/LoadingView";
import Modal from "./commons/Modal";
import EmptyPlaceholderView from "./commons/EmptyPlaceholderView";
import { storageService } from "@/services/storage.service";
import {
  PlusIcon,
  CubeTransparentIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/outline";

import { copanyManager } from "@/utils/cache";
import { useRouter } from "next/navigation";

type RepoData =
  RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"];

export default function CreateCopanyButton() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copanyName, setCopanyName] = useState("");
  const [copanyDescription, setCopanyDescription] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [isCreatingCopany, setIsCreatingCopany] = useState(false);

  const [status, setStatus] = useState<"loading" | "failed" | "success">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        // 阻止事件传播，防止触发被点击元素的点击事件
        event.stopPropagation();
        event.preventDefault();
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      // 使用 capture 阶段来确保我们能够先处理事件
      document.addEventListener("click", handleClickOutside, true);
      return () => {
        document.removeEventListener("click", handleClickOutside, true);
      };
    }
  }, [isDropdownOpen]);

  // 当弹窗打开时获取数据
  useEffect(() => {
    if (!isModalOpen) return;

    let cancelled = false;

    const fetchRepos = async () => {
      setStatus("loading");
      try {
        const result = await getOrgAndReposAction();

        if (!cancelled) {
          if (result.success && result.data) {
            setRepoData(result.data);
            setStatus("success");
          } else {
            setError(result.error || "Unknown error");
            setStatus("failed");
          }
        }
      } catch (error: unknown) {
        console.error("Error fetching repos", error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Unknown error");
        }
        setStatus("failed");
      }
    };

    fetchRepos();

    return () => {
      cancelled = true;
    };
  }, [isModalOpen]);

  // 获取选中的仓库
  const getSelectedRepo = () => {
    if (!selectedRepoId || !repoData) return null;
    return repoData.find((repo) => repo.id === selectedRepoId);
  };

  // 处理仓库选择，自动填充表单
  const handleRepoSelection = (repoId: number) => {
    setSelectedRepoId(repoId);
    setIsDropdownOpen(false);

    // 自动填充 copany 信息
    const repo = repoData?.find((r) => r.id === repoId);
    if (repo) {
      setCopanyName(repo.name);
      setCopanyDescription(repo.description || "");
    }
  };

  // 获取默认 logo URL
  const getDefaultLogoUrl = () => {
    const repo = getSelectedRepo();
    if (!repo) return "";

    // 使用仓库 owner 的头像（个人或组织）
    return repo.owner.avatar_url || "";
  };

  // 从 Supabase Storage URL 中提取文件路径
  const extractFilePathFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      const bucketIndex = pathParts.findIndex(
        (part) => part === "copany-logos"
      );

      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        return pathParts.slice(bucketIndex + 1).join("/");
      }
      return null;
    } catch (error) {
      console.error("Failed to parse URL:", error);
      return null;
    }
  };

  // 简化的文件选择处理函数
  const handleLogoFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件大小
    const maxSize = storageService.getMaxFileSize();
    if (file.size > maxSize) {
      setUploadError(
        `File size cannot exceed ${Math.round(maxSize / 1024 / 1024)}MB`
      );
      return;
    }

    // 检查文件类型
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }

    const repo = getSelectedRepo();
    if (!repo) {
      setUploadError("Please select a repository first");
      return;
    }

    // 清除错误并开始上传
    setUploadError(null);
    setIsUploading(true);

    try {
      // 先上传新的 logo
      const result = await storageService.uploadLogo(file, repo.name);

      if (result.success && result.url) {
        // 上传成功后，删除旧的 logo
        if (uploadedLogoUrl) {
          try {
            const filePath = extractFilePathFromUrl(uploadedLogoUrl);
            if (filePath) {
              await storageService.deleteLogo(filePath);
            }
          } catch (deleteError) {
            console.warn("Failed to delete previous logo:", deleteError);
          }
        }

        setIsImageLoading(true);
        setUploadedLogoUrl(result.url);
      } else {
        setUploadError(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Logo upload failed:", error);
      setUploadError("Upload failed");
    } finally {
      setIsUploading(false);
      // 清空文件输入，允许重新选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  async function handleCreateCopany(e: React.FormEvent) {
    e.preventDefault();
    setIsCreatingCopany(true);
    const repo = getSelectedRepo();
    if (!repo) {
      setIsCreatingCopany(false);
      return;
    }

    // 验证必填字段
    if (!copanyName.trim()) {
      setError("Copany name is required");
      setIsCreatingCopany(false);
      return;
    }

    try {
      let logoUrl = "";

      if (uploadedLogoUrl) {
        // 使用已上传的自定义 logo
        logoUrl = uploadedLogoUrl;
      } else {
        // 使用默认 logo (owner 头像)
        logoUrl = getDefaultLogoUrl();
      }

      const result = await createCopanyAction({
        name: copanyName,
        description: copanyDescription,
        logo_url: logoUrl,
        github_url: repo.html_url,
        telegram_url: null,
        discord_url: null,
        figma_url: null,
        notion_url: null,
      });
      if (result.success && result.copany) {
        // 将新创建的 copany 添加到缓存中
        copanyManager.setCopany(result.copany.id, result.copany);

        // 关闭弹窗
        setIsModalOpen(false);

        // 跳转到新创建的 copany 详情页
        router.push(`/copany/${result.copany.id}`);
      } else {
        setError(result.error || "Failed to create copany");
      }
    } catch (error) {
      console.error("Failed to create copany:", error);
      setError("Failed to create copany");
    } finally {
      setIsCreatingCopany(false);
    }
  }

  function handleCloseModal() {
    // 如果有未保存的上传 logo，删除它
    if (uploadedLogoUrl) {
      // 异步删除，不等待结果
      const filePath = extractFilePathFromUrl(uploadedLogoUrl);
      if (filePath) {
        storageService.deleteLogo(filePath).catch((error) => {
          console.warn("Failed to clean up unsaved logo:", error);
        });
      }
    }

    setIsModalOpen(false);
    setIsDropdownOpen(false);
    setSelectedRepoId(null);
    setUploadedLogoUrl(null);
    setIsUploading(false);
    setIsImageLoading(false);
    setUploadError(null);
    setCopanyName("");
    setCopanyDescription("");
    setStatus("loading");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // 获取选中仓库的显示信息
  const getSelectedRepoDisplay = () => {
    const repo = getSelectedRepo();
    if (!repo) return null;

    return {
      avatarUrl: repo.owner.avatar_url,
      fullName: repo.full_name, // 显示完整名称 owner/repo
      name: repo.name,
      ownerType: repo.owner.type, // User 或 Organization
    };
  };

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)} variant="ghost" size="sm">
        <div className="flex flex-row items-center gap-1">
          <PlusIcon
            strokeWidth={2}
            className="w-4 h-4 text-gray-900 dark:text-gray-100"
          />
          New copany
        </div>
      </Button>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} size="md">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Create New Copany
          </h2>

          <form onSubmit={handleCreateCopany} className="space-y-4">
            {repositorySelectionSection()}
            {copanyInfoSection()}
            {logoSelectionSection()}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                {error}
              </div>
            )}
            {actionButtonsSection()}
          </form>
        </div>
      </Modal>
    </>
  );

  function repositorySelectionSection() {
    const selectedDisplay = getSelectedRepoDisplay();

    return (
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Select repository
        </label>
        <div className="relative flex-1" ref={dropdownRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(!isDropdownOpen);
            }}
            className="flex items-center gap-2 rounded-md border-1 border-gray-300 dark:border-gray-700 px-2 py-1 h-fit w-full justify-between hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer"
          >
            {selectedDisplay ? (
              <div className="flex items-center gap-2">
                <Image
                  src={selectedDisplay.avatarUrl}
                  alt="Repository Owner Avatar"
                  width={20}
                  height={20}
                  className="rounded-sm w-4 h-4"
                />
                <span>{selectedDisplay.fullName}</span>
              </div>
            ) : (
              <span className="text-gray-500">Select Project</span>
            )}

            <ChevronDownIcon
              className={`w-3 h-3 text-gray-900 dark:text-gray-100 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {repositoryDropdown()}
        </div>
      </div>
    );
  }

  function repositoryDropdown() {
    if (!isDropdownOpen) return null;

    return (
      <div
        className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 max-h-84 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "loading" && (
          <div className="py-8">
            <LoadingView type="label" />
          </div>
        )}
        {status === "failed" && <div className="px-2 py-1">{error}</div>}
        {status === "success" && repoData && (
          <>
            {repoData.length === 0 ? (
              <EmptyPlaceholderView
                icon={
                  <CubeTransparentIcon className="w-12 h-12 text-gray-400 stroke-1" />
                }
                title="No available public repositories"
                description="You need at least one public repository to create a Copany. Go to GitHub to create a new public repository to get started."
                buttonTitle="Create GitHub Repository"
                buttonIcon={<ArrowUpRightIcon className="w-4 h-4" />}
                buttonAction={() =>
                  window.open("https://github.com/new", "_blank")
                }
                size="md"
              />
            ) : (
              repoData.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
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
                    className="w-6 h-6"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {repo.full_name}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {repo.description || "No description"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    );
  }

  function copanyInfoSection() {
    return (
      <div className="flex flex-col gap-2">
        <label
          htmlFor="copanyName"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
        >
          Copany Name
        </label>
        <input
          type="text"
          id="copanyName"
          value={copanyName}
          onChange={(e) => setCopanyName(e.target.value)}
          className="mt-1 block w-full px-2 py-1 border-1 rounded-md bg-transparent border-gray-300 dark:border-gray-700 dark:text-gray-100"
          placeholder="Enter copany name"
        />
      </div>
    );
  }

  function logoSelectionSection() {
    return (
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Copany logo
        </label>

        {logoDisplayWithUpload()}
      </div>
    );
  }

  function logoDisplayWithUpload() {
    const currentLogoUrl = uploadedLogoUrl || getDefaultLogoUrl();

    return (
      <div className="flex flex-col items-center space-y-3">
        {/* Logo 展示区域 */}
        <div className="relative">
          {currentLogoUrl ? (
            <div className="relative w-24 h-24">
              {(isUploading || isImageLoading) && (
                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-lg flex items-center justify-center z-10"></div>
              )}
              <Image
                src={currentLogoUrl}
                alt="Copany Logo"
                width={96}
                height={96}
                className="w-24 h-24 rounded-lg border-1 border-gray-300 dark:border-gray-700"
                onLoad={() => setIsImageLoading(false)}
                onError={() => setIsImageLoading(false)}
              />
            </div>
          ) : (
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
              <span className="text-gray-400 text-sm">No Logo</span>
            </div>
          )}
        </div>

        {/* 上传按钮 */}
        <div className="flex flex-col items-center w-fit space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={handleLogoFileChange}
            className="hidden"
          />

          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isImageLoading}
            size="sm"
          >
            {isUploading || isImageLoading
              ? "Uploading..."
              : "Upload new picture"}
          </Button>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            PNG, JPG, JPEG, GIF, WebP • Max 1MB
          </p>

          {/* 错误提示 */}
          {uploadError && (
            <div className="text-xs text-red-600 dark:text-red-400 text-center">
              {uploadError}
            </div>
          )}
        </div>
      </div>
    );
  }

  function actionButtonsSection() {
    return (
      <div className="flex gap-2 pt-4 justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleCloseModal}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!selectedRepoId || isCreatingCopany}
        >
          {isCreatingCopany ? "Creating..." : "Create Copany"}
        </Button>
      </div>
    );
  }
}
