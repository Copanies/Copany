"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import BasicNavigation from "@/components/commons/BasicNavigation";
import Image from "next/image";
import { useDarkMode } from "@/utils/useDarkMode";
import {
  ChevronDownIcon,
  InformationCircleIcon,
  CubeTransparentIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
import githubIconBlack from "@/assets/github_logo.svg";
import githubIconWhite from "@/assets/github_logo_dark.svg";
import { getOrgAndReposAction } from "@/actions/github.action";
import { useCreateCopany } from "@/hooks/copany";
import { storageService } from "@/services/storage.service";
import Button from "@/components/commons/Button";
import LoadingView from "@/components/commons/LoadingView";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { EMPTY_ARRAY, EMPTY_STRING } from "@/utils/constants";
import MilkdownEditor from "@/components/commons/MilkdownEditor";

export default function New() {
  const router = useRouter();
  const [projectType, setProjectType] = useState("existing");
  const [_selectedRepo, setSelectedRepo] = useState("");
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [useCOSL, setUseCOSL] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [ideaSummary, setIdeaSummary] = useState(""); // 一句话描述这个想法
  const [ideaDescription, setIdeaDescription] = useState(""); // 详细的描述这个想法
  const [productName, setProductName] = useState(""); // 产品代号/名称
  const isDarkMode = useDarkMode();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorDivRef = useRef<HTMLDivElement>(null);

  // 处理编辑器内容变化的回调函数
  const handleIdeaDescriptionChange = useCallback((content: string) => {
    setIdeaDescription(content);
  }, []);

  // 使用 React Query 获取仓库数据
  const {
    data: repoData,
    status,
    error: repoError,
  } = useQuery({
    queryKey: ["github", "repos"],
    queryFn: getOrgAndReposAction,
    enabled: isGitHubConnected && projectType === "existing",
    staleTime: 5 * 60 * 1000, // 5分钟
  });

  // 使用 React Query 创建 copany
  const createCopanyMutation = useCreateCopany(async (result) => {
    if (result.success && result.copany) {
      if (projectType === "new") {
        // 如果是新想法，需要创建初始讨论
        try {
          // 等待一下确保数据库触发器完成默认标签创建
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // 获取 "Begin idea" 标签
          const { getDiscussionLabelsByCopanyIdAction } = await import(
            "@/actions/discussionLabel.actions"
          );
          const labelsResult = await getDiscussionLabelsByCopanyIdAction(
            result.copany.id
          );

          if (labelsResult.success && labelsResult.labels) {
            const beginIdeaLabel = labelsResult.labels.find(
              (label) => label.name === "Begin idea"
            );

            if (beginIdeaLabel) {
              // 创建初始讨论
              const { createDiscussionAction } = await import(
                "@/actions/discussion.actions"
              );
              await createDiscussionAction({
                copanyId: result.copany.id,
                title: ideaSummary, // 一句话描述作为标题
                description: ideaDescription, // 详细描述作为内容
                labels: [beginIdeaLabel.id], // 使用标签ID而不是名称
              });
            }
          }
        } catch (error) {
          console.error("Failed to create discussion:", error);
        }
      }

      // 跳转到 copany 页面
      router.push(`/copany/${result.copany.id}`);
    }
  });

  // 使用 useRef 稳定 mutation 方法，避免 effect 依赖整个对象
  const mutateRef = useRef(createCopanyMutation.mutate);
  useEffect(() => {
    mutateRef.current = createCopanyMutation.mutate;
  }, [createCopanyMutation.mutate]);

  const projectTypeOptions = [
    { value: "new", label: "Brand new idea" },
    { value: "existing", label: "Existing project" },
  ];

  const coslOptions = [
    {
      value: true,
      label: "Yes, I want to share the benefits according to my contribution",
    },
    {
      value: false,
      label:
        "No, I don't want to share the benefits according to my contribution",
    },
  ];

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

  // 获取选中的仓库
  const getSelectedRepo = () => {
    if (!selectedRepoId || !repoData?.data) return null;
    return repoData.data.find((repo) => repo.id === selectedRepoId);
  };

  // 处理仓库选择，自动填充表单
  const handleRepoSelection = (repoId: number) => {
    setSelectedRepoId(repoId);
    setIsDropdownOpen(false);

    // 自动填充 copany 信息
    const repo = repoData?.data?.find((r) => r.id === repoId);
    if (repo) {
      setCompanyName(repo.name);
      setCompanyDescription(repo.description || EMPTY_STRING);
      setSelectedRepo(repo.name); // 保持向后兼容
    }
  };

  // 获取默认 logo URL
  const getDefaultLogoUrl = () => {
    const repo = getSelectedRepo();
    if (!repo) return EMPTY_STRING;

    // 使用仓库 owner 的头像（个人或组织）
    return repo.owner.avatar_url || EMPTY_STRING;
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
    const maxSize = storageService.getMaxLogoFileSize();
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

  // Connect with GitHub 按钮处理
  const handleConnectGitHub = () => {
    // 这里应该触发 GitHub OAuth 流程
    // 现在先模拟连接成功
    setIsGitHubConnected(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (projectType === "existing") {
      // 已存在项目的逻辑
      const repo = getSelectedRepo();
      if (!repo) {
        return;
      }

      // 验证必填字段
      if (!companyName.trim()) {
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

        // 使用 React Query mutation 创建 copany
        createCopanyMutation.mutate({
          name: companyName,
          description: companyDescription,
          logo_url: logoUrl,
          github_url: repo.html_url,
          github_repository_id: repo.id.toString(),
        });
      } catch (error) {
        console.error("Failed to create copany:", error);
      }
    } else {
      // 新想法的逻辑
      // 验证必填字段
      if (
        !productName.trim() ||
        !ideaSummary.trim() ||
        !ideaDescription.trim()
      ) {
        return;
      }

      try {
        // 使用 React Query mutation 创建 copany
        // 这里不绑定 github_url
        createCopanyMutation.mutate({
          name: productName, // 产品代号/名称作为 copany 的 name
          description: ideaSummary, // 一句话描述作为 copany 的 description
          logo_url: "", // 新想法暂时没有 logo
          // 不传递 github_url 和 github_repository_id
        });
      } catch (error) {
        console.error("Failed to create copany:", error);
      }
    }
  };

  const existRepoForm = () => {
    return (
      <>
        <div className="flex flex-col items-start gap-3 w-full">
          <label
            htmlFor="github-repo"
            className="text-sm font-normal text-gray-900 dark:text-gray-100"
          >
            Select GitHub repository
          </label>

          <div className="flex items-center gap-2.5 w-full">
            <div className="relative flex-1" ref={dropdownRef}>
              {isGitHubConnected ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(!isDropdownOpen);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 w-full justify-between hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  >
                    {getSelectedRepoDisplay() ? (
                      <div className="flex items-center gap-2">
                        <Image
                          src={getSelectedRepoDisplay()!.avatarUrl}
                          alt="Repository Owner Avatar"
                          width={20}
                          height={20}
                          className="rounded-sm w-5 h-5"
                        />
                        <span>{getSelectedRepoDisplay()!.fullName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        Select repo
                      </span>
                    )}

                    <ChevronDownIcon
                      className={`w-4 h-4 text-gray-900 dark:text-gray-100 ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isDropdownOpen && (
                    <div
                      className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-120 overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {status === "pending" && (
                        <div className="py-8">
                          <LoadingView type="label" delay={500} />
                        </div>
                      )}
                      {status === "error" && (
                        <div className="px-4 py-3 text-red-600 dark:text-red-400">
                          {repoError?.message || "Failed to load repositories"}
                        </div>
                      )}
                      {status === "success" && repoData?.data && (
                        <>
                          {(repoData.data || EMPTY_ARRAY).length === 0 ? (
                            <div className="p-4">
                              <EmptyPlaceholderView
                                icon={
                                  <CubeTransparentIcon className="w-12 h-12 text-gray-400 stroke-1" />
                                }
                                title="No available public repositories"
                                description="You need at least one public repository to create a Copany. Go to GitHub to create a new public repository to get started."
                                buttonTitle="Create GitHub Repository"
                                buttonIcon={
                                  <ArrowUpRightIcon className="w-4 h-4" />
                                }
                                buttonAction={() =>
                                  window.open(
                                    "https://github.com/new",
                                    "_blank"
                                  )
                                }
                                size="md"
                              />
                            </div>
                          ) : (
                            (repoData.data || EMPTY_ARRAY).map((repo) => (
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
                            ))
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 w-full text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                  <span>Please connect with GitHub first</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleConnectGitHub}
            disabled={isGitHubConnected}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-800 dark:bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Image
              src={isDarkMode ? githubIconBlack : githubIconWhite}
              alt="GitHub Logo"
              className="w-4 h-4"
              width={16}
              height={16}
            />

            <span className="text-sm font-semibold text-white dark:text-gray-900 whitespace-nowrap">
              {isGitHubConnected ? "Connected" : "Connect with GitHub"}
            </span>
          </button>
        </div>

        <div className="flex flex-col items-start gap-3 w-full">
          <label
            htmlFor="copany-name"
            className="text-sm font-normal text-gray-900 dark:text-gray-100"
          >
            Copany name
          </label>

          <div className="flex flex-col items-start gap-2.5 w-full">
            <input
              type="text"
              id="copany-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Name"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 dark:bg-gray-800"
            />
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 w-full">
          <label
            htmlFor="copany-description"
            className="text-sm font-normal text-gray-900 dark:text-gray-100"
          >
            Copany description
          </label>

          <div className="flex flex-col items-start gap-2.5 w-full">
            <textarea
              id="copany-description"
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
              placeholder="Description"
              className="w-full h-24 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 resize-none bg-white dark:bg-gray-800"
            />
          </div>
        </div>

        {/* Logo 上传部分 */}
        <div className="flex flex-col items-start gap-3 w-full">
          <label className="text-sm font-normal text-gray-900 dark:text-gray-100">
            Copany logo
          </label>

          <div className="flex flex-col items-center space-y-3 w-full">
            {/* Logo 展示区域 */}
            <div className="relative">
              {(() => {
                const currentLogoUrl = uploadedLogoUrl || getDefaultLogoUrl();
                return currentLogoUrl ? (
                  <div className="relative w-24 h-24">
                    {(isUploading || isImageLoading) && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-lg flex items-center justify-center z-10"></div>
                    )}
                    <Image
                      src={currentLogoUrl}
                      alt="Copany Logo"
                      width={96}
                      height={96}
                      className="w-24 h-24 rounded-lg border border-gray-300 dark:border-gray-700"
                      onLoad={() => setIsImageLoading(false)}
                      onError={() => setIsImageLoading(false)}
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No Logo</span>
                  </div>
                );
              })()}
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
                disabled={isUploading || isImageLoading || !getSelectedRepo()}
                size="sm"
                variant="secondary"
              >
                {isUploading || isImageLoading
                  ? "Uploading..."
                  : "Upload new picture"}
              </Button>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                PNG, JPG, JPEG, GIF, WebP • Max 1MB
              </p>

              {/* 错误提示 */}
              {uploadError && (
                <div className="text-sm text-red-600 dark:text-red-400 text-center">
                  {uploadError}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  const newIdeaForm = () => {
    return (
      <>
        <div className="flex flex-col items-start gap-3 w-full">
          <label
            htmlFor="idea-summary"
            className="text-sm font-normal text-gray-900 dark:text-gray-100"
          >
            One-line description of this idea
          </label>

          <div className="flex flex-col items-start gap-2.5 w-full">
            <input
              type="text"
              id="idea-summary"
              value={ideaSummary}
              onChange={(e) => setIdeaSummary(e.target.value)}
              placeholder="New idea"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 dark:bg-gray-800"
            />
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 w-full">
          <label
            htmlFor="idea-description"
            className="text-sm font-normal text-gray-900 dark:text-gray-100"
          >
            Describe this idea in detail
          </label>

          <div className="flex flex-col items-start gap-2.5 w-full">
            <div
              ref={editorDivRef}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-800"
            >
              <MilkdownEditor
                initialContent={`* *What is the problem you want to solve?*

<br />

* *If you want to do a minimum viable product (MVP), how would you do it?*

`}
                onContentChange={handleIdeaDescriptionChange}
                placeholder="Description"
                className="min-h-[96px]"
                maxSizeTitle="sm"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 w-full">
          <label
            htmlFor="product-name"
            className="text-sm font-normal text-gray-900 dark:text-gray-100"
          >
            Product name
          </label>

          <div className="flex flex-col items-start gap-2.5 w-full">
            <input
              type="text"
              id="product-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Name"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 dark:bg-gray-800"
            />
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col min-h-screen items-center bg-[#FBF9F5] dark:bg-background-dark">
      <BasicNavigation />

      <div className="flex flex-col w-full max-w-2xl items-center gap-16 pt-8 pb-16 px-6 flex-1">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center gap-5 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm"
        >
          <div className="flex flex-col items-start gap-5 px-8 py-8 w-full">
            <div className="flex flex-col items-start gap-1">
              <h1 className="text-3xl font-normal text-gray-900 dark:text-gray-100">
                Create new copany
              </h1>

              <p className="text-sm font-normal text-gray-600 dark:text-gray-400">
                Freer creation, fairer rewards.
              </p>
            </div>

            <div className="flex flex-col items-start gap-5 w-full">
              <fieldset className="flex flex-col items-start gap-3 w-full">
                <p className="text-sm font-normal text-gray-900 dark:text-gray-100">
                  It is a:
                </p>

                <div className="flex flex-col items-start gap-4 w-full">
                  {projectTypeOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="projectType"
                        value={option.value}
                        checked={projectType === option.value}
                        onChange={(e) => setProjectType(e.target.value)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded-full border-1 border-gray-800 dark:border-gray-200 relative ${
                          projectType === option.value
                            ? "bg-gray-800 dark:bg-gray-200"
                            : "bg-transparent"
                        }`}
                      >
                        {projectType === option.value && (
                          <div className="w-2 h-2 bg-white dark:bg-gray-900 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                        )}
                      </div>

                      <span className="text-sm font-normal text-gray-900 dark:text-gray-100">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {projectType === "existing" ? existRepoForm() : newIdeaForm()}

              <fieldset className="flex flex-col items-start gap-3 w-full">
                <div className="flex items-center gap-3">
                  <legend className="text-sm font-normal text-gray-900 dark:text-gray-100">
                    Do you want to use Copany Open Source License (COSL)?
                  </legend>

                  <div className="w-5 h-5">
                    <InformationCircleIcon
                      className="w-5 h-5"
                      strokeWidth={1.6}
                    />
                  </div>
                </div>

                <div className="flex flex-col items-start gap-4 w-full">
                  {coslOptions.map((option) => (
                    <label
                      key={option.value.toString()}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="useCOSL"
                        value={option.value.toString()}
                        checked={useCOSL === option.value}
                        onChange={(e) => setUseCOSL(e.target.value === "true")}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded-full border-2 border-gray-800 dark:border-gray-200 relative ${
                          useCOSL === option.value
                            ? "bg-gray-800 dark:bg-gray-200"
                            : "bg-transparent"
                        }`}
                      >
                        {useCOSL === option.value && (
                          <div className="w-2 h-2 bg-white dark:bg-gray-900 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                        )}
                      </div>

                      <span
                        className="text-sm
                       font-normal text-gray-900 dark:text-gray-100"
                      >
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {/* 错误提示 */}
            {createCopanyMutation.error && (
              <div className="w-full text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {createCopanyMutation.error?.message ||
                  "Failed to create copany"}
              </div>
            )}

            <button
              type="submit"
              disabled={
                (projectType === "existing" && !getSelectedRepo()) ||
                (projectType === "new" &&
                  (!productName.trim() ||
                    !ideaSummary.trim() ||
                    !ideaDescription.trim())) ||
                createCopanyMutation.isPending
              }
              className="w-full px-3 py-2.5 rounded-lg border border-gray-800 dark:border-gray-200 bg-gray-800 dark:bg-gray-200 cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-gray-900"
            >
              <span className="text-sm font-semibold text-white dark:text-gray-900 whitespace-nowrap">
                {createCopanyMutation.isPending ? "Creating..." : "Create"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
