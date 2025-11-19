"use client";

import {
  updateCopanyAction,
  deleteCopanyAction,
} from "@/actions/copany.actions";
import Button from "@/components/commons/Button";
import Modal from "@/components/commons/Modal";
import { Copany } from "@/types/database.types";
import { useState, useRef } from "react";
import GithubIcon from "@/assets/github_logo.svg";
import FigmaIcon from "@/assets/figma_logo.svg";
import TelegramIcon from "@/assets/telegram_logo.svg";
import DiscordIcon from "@/assets/discord_logo.svg";
import NotionIcon from "@/assets/notion_logo.png";
import GithubDarkIcon from "@/assets/github_logo_dark.svg";
import DiscordDarkIcon from "@/assets/discord_logo_dark.svg";
import NotionDarkIcon from "@/assets/notion_logo_dark.png";
import AppleAppStoreIcon from "@/assets/apple_app_store_logo.webp";
import GooglePlayStoreIcon from "@/assets/google_play_store_logo.png";
import WebsiteIcon from "@/assets/website_logo.svg";
import WebsiteDarkIcon from "@/assets/website_logo_dark.svg";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import AssetLinkModal from "./AssetLinkModal";
import { storageService } from "@/services/storage.service";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EMPTY_STRING } from "@/utils/constants";
import CopanyHeader from "@/components/copany/CopanyHeader";
import ConnectToAppStoreConnect from "@/components/finance/ConnectToAppStoreConnect";
import AppleAppStoreConnectLogo from "@/assets/apple_app_store_connect_logo.png";

interface SettingsViewProps {
  copany: Copany;
  onCopanyUpdate: (copany: Copany) => void;
}

export default function SettingsView({
  copany,
  onCopanyUpdate,
}: SettingsViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isDarkMode = useDarkMode();
  const [name, setName] = useState(copany.name);
  const [description, setDescription] = useState(
    copany.description || EMPTY_STRING
  );
  const [isRenaming, setIsRenaming] = useState(false);
  const [isAddAssetLinkModalOpen, setIsAddAssetLinkModalOpen] = useState(false);
  const [isEditAssetLinkModalOpen, setIsEditAssetLinkModalOpen] =
    useState(false);
  const [editingAssetLink, setEditingAssetLink] = useState<{
    type: number;
    currentValue: string;
  } | null>(null);

  // Logo related states
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cover image related states
  const [uploadedCoverImageUrl, setUploadedCoverImageUrl] = useState<
    string | null
  >(null);
  const [isUploadingCoverImage, setIsUploadingCoverImage] = useState(false);
  const [isCoverImageLoading, setIsCoverImageLoading] = useState(false);
  const [coverImageUploadError, setCoverImageUploadError] = useState<
    string | null
  >(null);
  const [isDeletingCoverImage, setIsDeletingCoverImage] = useState(false);
  const coverImageFileInputRef = useRef<HTMLInputElement>(null);

  // Delete Copany related states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] =
    useState<string>(EMPTY_STRING);
  const [isDeleting, setIsDeleting] = useState(false);

  // Update Description related states
  const [isUpdatingDescription, setIsUpdatingDescription] = useState(false);

  // React Query mutations
  const updateCopanyMutation = useMutation({
    mutationFn: updateCopanyAction,
    onSuccess: (updatedCopany) => {
      // 更新本地状态
      onCopanyUpdate(updatedCopany);

      // 失效相关查询
      queryClient.invalidateQueries({ queryKey: ["copany", copany.id] });
      queryClient.invalidateQueries({ queryKey: ["copanies"] });

      // 设置查询数据以保持 UI 同步
      queryClient.setQueryData(["copany", copany.id], updatedCopany);
    },
    onError: (error) => {
      console.error("Failed to update copany:", error);
    },
  });

  const deleteCopanyMutation = useMutation({
    mutationFn: deleteCopanyAction,
    onSuccess: () => {
      // 失效相关查询
      queryClient.invalidateQueries({ queryKey: ["copanies"] });
      // 重定向到首页
      router.push("/");
    },
    onError: (error) => {
      console.error("Failed to delete copany:", error);
    },
  });

  // 稳定 mutation 的可变方法
  const updateCopanyMutateRef = useRef(updateCopanyMutation.mutateAsync);
  const deleteCopanyMutateRef = useRef(deleteCopanyMutation.mutateAsync);

  // 同步 ref 中的最新函数
  if (updateCopanyMutation.mutateAsync !== updateCopanyMutateRef.current) {
    updateCopanyMutateRef.current = updateCopanyMutation.mutateAsync;
  }
  if (deleteCopanyMutation.mutateAsync !== deleteCopanyMutateRef.current) {
    deleteCopanyMutateRef.current = deleteCopanyMutation.mutateAsync;
  }

  const assetLinks = [
    {
      label: "Github",
      key: "github_url",
      value: copany.github_url,
      icon: GithubIcon,
      darkIcon: GithubDarkIcon,
      id: 1,
    },
    {
      label: "Figma",
      key: "figma_url",
      value: copany.figma_url,
      icon: FigmaIcon,
      darkIcon: FigmaIcon,
      id: 2,
    },
    {
      label: "Notion",
      key: "notion_url",
      value: copany.notion_url,
      icon: NotionIcon,
      darkIcon: NotionDarkIcon,
      id: 3,
    },
    {
      label: "Telegram",
      key: "telegram_url",
      value: copany.telegram_url,
      icon: TelegramIcon,
      darkIcon: TelegramIcon,
      id: 4,
    },
    {
      label: "Discord",
      key: "discord_url",
      value: copany.discord_url,
      icon: DiscordIcon,
      darkIcon: DiscordDarkIcon,
      id: 5,
    },
    {
      label: "Website",
      key: "website_url",
      value: copany.website_url,
      icon: WebsiteIcon,
      darkIcon: WebsiteDarkIcon,
      id: 6,
    },
    {
      label: "Apple App Store",
      key: "apple_app_store_url",
      value: copany.apple_app_store_url,
      icon: AppleAppStoreIcon,
      darkIcon: AppleAppStoreIcon,
      id: 7,
    },
    {
      label: "Google Play Store",
      key: "google_play_store_url",
      value: copany.google_play_store_url,
      icon: GooglePlayStoreIcon,
      darkIcon: GooglePlayStoreIcon,
      id: 8,
    },
  ];

  async function renameCopany() {
    setIsRenaming(true);
    try {
      const updatedCopany = {
        ...copany,
        name: name,
      };
      await updateCopanyMutateRef.current(updatedCopany);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRenaming(false);
    }
  }

  async function updateDescription() {
    setIsUpdatingDescription(true);
    try {
      const updatedCopany = {
        ...copany,
        description: description,
      };
      await updateCopanyMutateRef.current(updatedCopany);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingDescription(false);
    }
  }

  async function deleteAssetLink(assetType: number) {
    try {
      const updatedCopany = {
        ...copany,
        [assetLinks.find((link) => link.id === assetType)?.key || ""]: null,
      };
      await updateCopanyMutateRef.current(updatedCopany);
    } catch (error) {
      console.error(error);
    }
  }

  function openEditModal(assetType: number, currentValue: string) {
    setEditingAssetLink({ type: assetType, currentValue });
    setIsEditAssetLinkModalOpen(true);
  }

  // Extract file path from Supabase Storage URL
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

  // Handle logo file selection and upload
  const handleLogoFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size
    const maxSize = storageService.getMaxLogoFileSize();
    if (file.size > maxSize) {
      setUploadError(
        `File size cannot exceed ${Math.round(maxSize / 1024 / 1024)}MB`
      );
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }

    // Clear errors and start upload
    setUploadError(null);
    setIsUploading(true);

    try {
      // Upload new logo first
      const result = await storageService.uploadLogo(file);

      if (result.success && result.url) {
        // After successful upload, delete old logo
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

        // Immediately update copany's logo_url
        const updatedCopany = {
          ...copany,
          logo_url: result.url,
        };
        await updateCopanyMutateRef.current(updatedCopany);
      } else {
        setUploadError(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Logo upload failed:", error);
      setUploadError("Upload failed");
    } finally {
      setIsUploading(false);
      // Clear file input to allow reselecting the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle cover image file selection and upload
  const handleCoverImageFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size
    const maxSize = storageService.getMaxCoverImageFileSize();
    if (file.size > maxSize) {
      setCoverImageUploadError(
        `File size cannot exceed ${Math.round(maxSize / 1024 / 1024)}MB`
      );
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      setCoverImageUploadError("Please select an image file");
      return;
    }

    // Clear errors and start upload
    setCoverImageUploadError(null);
    setIsUploadingCoverImage(true);

    try {
      // Upload new cover image first
      const result = await storageService.uploadCoverImage(file);

      if (result.success && result.url) {
        // After successful upload, delete old cover image
        if (uploadedCoverImageUrl) {
          try {
            const filePath = storageService.extractCoverImagePathFromUrl(
              uploadedCoverImageUrl
            );
            if (filePath) {
              await storageService.deleteCoverImage(filePath);
            }
          } catch (deleteError) {
            console.warn("Failed to delete previous cover image:", deleteError);
          }
        }

        setIsCoverImageLoading(true);
        setUploadedCoverImageUrl(result.url);

        // Immediately update copany's cover_image_url
        const updatedCopany = {
          ...copany,
          cover_image_url: result.url,
        };
        await updateCopanyMutateRef.current(updatedCopany);
      } else {
        setCoverImageUploadError(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Cover image upload failed:", error);
      setCoverImageUploadError("Upload failed");
    } finally {
      setIsUploadingCoverImage(false);
      // Clear file input to allow reselecting the same file
      if (coverImageFileInputRef.current) {
        coverImageFileInputRef.current.value = "";
      }
    }
  };

  // Handle delete cover image
  const handleDeleteCoverImage = async () => {
    setIsDeletingCoverImage(true);
    try {
      const currentCoverImageUrl =
        uploadedCoverImageUrl || copany.cover_image_url;

      if (currentCoverImageUrl) {
        // Delete from storage
        const filePath =
          storageService.extractCoverImagePathFromUrl(currentCoverImageUrl);
        if (filePath) {
          await storageService.deleteCoverImage(filePath);
        }

        // Update copany's cover_image_url to null
        const updatedCopany = {
          ...copany,
          cover_image_url: null,
        };
        await updateCopanyMutateRef.current(updatedCopany);

        // Clear local state
        setUploadedCoverImageUrl(null);
      }
    } catch (error) {
      console.error("Failed to delete cover image:", error);
    } finally {
      setIsDeletingCoverImage(false);
    }
  };

  // Handle delete Copany
  async function handleDeleteCopany() {
    setIsDeleting(true);
    try {
      await deleteCopanyMutateRef.current(copany.id);
    } catch (error) {
      console.error("Failed to delete Copany:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  // Close delete modal
  function handleCloseDeleteModal() {
    setIsDeleteModalOpen(false);
    setDeleteConfirmName(EMPTY_STRING);
  }

  return (
    <div className="flex flex-col gap-4 px-4">
      <CopanyHeader copany={copany} showCoverImage={false} />
      <div className="flex flex-col gap-8 pb-8 px-0">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">General</h1>
          <div className="flex flex-col gap-2">{renameSection()}</div>
          <div className="flex flex-col gap-2">{descriptionSection()}</div>
          <div className="flex flex-col gap-2">{logoSection()}</div>
          <div className="flex flex-col gap-2">{coverImageSection()}</div>
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Finance</h1>
          <div className="flex flex-col gap-2">{connectSection()}</div>
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Assest links</h1>
          <div className="flex flex-col gap-2">{assetLinksSection()}</div>
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">
            Danger Zone
          </h1>
          <div className="flex flex-col gap-2">{deleteCopanySection()}</div>
        </div>

        {/* Delete confirmation modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          size="md"
        >
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Delete {copany.name}
            </h2>

            {/* Copany information display */}
            <div className="flex flex-col items-center gap-3 mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              {copany.logo_url ? (
                <Image
                  src={copany.logo_url}
                  alt={copany.name}
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-lg"
                  placeholder="blur"
                  blurDataURL={shimmerDataUrlWithTheme(96, 96, isDarkMode)}
                />
              ) : (
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <span className="text-gray-400 text-base">No Logo</span>
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-900 text-center dark:text-gray-100">
                  {copany.name}
                </h3>
                {copany.description && (
                  <p className="text-base text-gray-500 text-center dark:text-gray-400">
                    {copany.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-base text-gray-700 dark:text-gray-300 mb-3">
                To confirm, type{" "}
                <span className="font-semibold">&quot;{copany.name}&quot;</span>{" "}
                in the box below
              </p>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                className="w-full px-3 py-1 rounded-md border-1 border-red-600 dark:border-red-400 bg-transparent dark:text-gray-100"
              />
            </div>

            <div className="flex w-full">
              <Button
                disabled={deleteConfirmName !== copany.name || isDeleting}
                className="w-full"
                onClick={handleDeleteCopany}
                variant="danger"
              >
                {isDeleting ? "Deleting..." : "Delete this Copany"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );

  function renameSection() {
    return (
      <div className="flex flex-col gap-3 max-w-full">
        <label htmlFor="name" className="text-base font-semibold">
          Copany name
        </label>
        <div className="flex flex-row gap-3 max-w-full">
          <input
            type="text"
            id="name"
            value={name}
            className="border border-gray-300 dark:border-gray-700 max-w-full rounded-md px-2 py-1"
            onChange={(e) => setName(e.target.value)}
          />
          <Button onClick={renameCopany} disabled={isRenaming}>
            {isRenaming ? "Renaming..." : "Rename"}
          </Button>
        </div>
      </div>
    );
  }

  function descriptionSection() {
    return (
      <div className="flex flex-col gap-3 max-w-full">
        <label className="text-base font-semibold">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 max-w-screen-sm min-h-20 rounded-md px-2 py-1"
        />
        <Button
          onClick={updateDescription}
          disabled={isUpdatingDescription}
          className="w-fit"
        >
          {isUpdatingDescription ? "Updating..." : "Update Description"}
        </Button>
      </div>
    );
  }

  function logoSection() {
    const currentLogoUrl = uploadedLogoUrl || copany.logo_url;

    return (
      <div className="flex flex-col gap-3 max-w-full">
        <label className="text-base font-semibold">Copany logo</label>

        <div className="flex flex-col space-y-3">
          {/* Logo display area */}
          <div className="relative">
            {currentLogoUrl ? (
              <div className="relative w-24 h-24">
                {(isUploading || isImageLoading) && (
                  <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-lg flex justify-center z-10"></div>
                )}
                <Image
                  src={currentLogoUrl}
                  alt="Copany Logo"
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-lg"
                  placeholder="blur"
                  blurDataURL={shimmerDataUrlWithTheme(96, 96, isDarkMode)}
                  onLoad={() => setIsImageLoading(false)}
                  onError={() => setIsImageLoading(false)}
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <span className="text-gray-400 text-base">No Logo</span>
              </div>
            )}
          </div>

          {/* Upload button */}
          <div className="flex flex-col w-fit space-y-2">
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
              className="w-fit"
            >
              {isUploading || isImageLoading
                ? "Uploading..."
                : "Upload new picture"}
            </Button>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              PNG, JPG, JPEG, GIF, WebP • Max 1MB
            </p>

            {/* Error message */}
            {uploadError && (
              <div className="text-base text-red-600 dark:text-red-400 text-center">
                {uploadError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function coverImageSection() {
    const currentCoverImageUrl =
      uploadedCoverImageUrl || copany.cover_image_url;

    return (
      <div className="flex flex-col gap-3 max-w-full">
        <label className="text-base font-semibold">Cover image</label>

        <div className="flex flex-col space-y-3">
          {/* Cover image display area */}
          <div className="relative">
            {currentCoverImageUrl ? (
              <div className="relative w-full max-w-md h-32">
                {(isUploadingCoverImage || isCoverImageLoading) && (
                  <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-lg flex justify-center z-10"></div>
                )}
                <Image
                  src={currentCoverImageUrl}
                  alt="Cover Image"
                  width={400}
                  height={128}
                  className="w-full h-32 object-cover rounded-lg border-1 border-gray-300 dark:border-gray-700"
                  placeholder="blur"
                  blurDataURL={shimmerDataUrlWithTheme(400, 128, isDarkMode)}
                  onLoad={() => setIsCoverImageLoading(false)}
                  onError={() => setIsCoverImageLoading(false)}
                />
                {/* Delete button overlay */}
                <div className="absolute top-2 right-2">
                  <Button
                    onClick={handleDeleteCoverImage}
                    disabled={
                      isDeletingCoverImage ||
                      isUploadingCoverImage ||
                      isCoverImageLoading
                    }
                    variant="secondary"
                    shape="square"
                    className="!p-1"
                    title="Delete cover image"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md h-32 bg-gray-100 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <span className="text-gray-400 text-base">No Cover Image</span>
              </div>
            )}
          </div>

          {/* Upload button */}
          <div className="flex flex-col w-fit space-y-2">
            <input
              ref={coverImageFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              onChange={handleCoverImageFileChange}
              className="hidden"
            />

            <Button
              type="button"
              onClick={() => coverImageFileInputRef.current?.click()}
              disabled={isUploadingCoverImage || isCoverImageLoading}
              className="w-fit"
            >
              {isUploadingCoverImage || isCoverImageLoading
                ? "Uploading..."
                : "Upload cover image"}
            </Button>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              PNG, JPG, JPEG, GIF, WebP • Max 5MB
            </p>

            {/* Error message */}
            {coverImageUploadError && (
              <div className="text-base text-red-600 dark:text-red-400 text-center">
                {coverImageUploadError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function assetLinksSection() {
    return (
      <div className="flex flex-col gap-5">
        {assetLinks.map((link) => {
          if (link.value) {
            return (
              <div className="flex flex-col gap-1" key={link.id}>
                <div className="flex flex-row gap-3 items-center" key={link.id}>
                  <div className="flex flex-row gap-2 items-center">
                    <Image
                      src={isDarkMode ? link.darkIcon : link.icon}
                      alt={link.label || ""}
                      className="w-5 h-5"
                      width={20}
                      height={20}
                    />
                    <p className="text-base font-semibold text-center">
                      {link.label}
                    </p>
                  </div>
                  <div className="flex flex-row gap-1">
                    <button
                      onClick={() => openEditModal(link.id, link.value || "")}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => deleteAssetLink(link.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
                <a
                  href={link.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline inline-block break-all max-w-full w-fit text-base text-gray-500 dark:text-gray-400"
                >
                  {link.value}
                </a>
              </div>
            );
          }
        })}
        <Button
          className="w-fit"
          onClick={() => {
            setIsAddAssetLinkModalOpen(true);
          }}
        >
          Add asset link
        </Button>
        <AssetLinkModal
          isOpen={isAddAssetLinkModalOpen}
          onClose={() => {
            setIsAddAssetLinkModalOpen(false);
          }}
          assetLinks={assetLinks}
          copany={copany}
          onCopanyUpdate={onCopanyUpdate}
        />
        <AssetLinkModal
          isOpen={isEditAssetLinkModalOpen}
          onClose={() => {
            setIsEditAssetLinkModalOpen(false);
            setEditingAssetLink(null);
          }}
          assetLinks={assetLinks}
          copany={copany}
          editingAssetLink={editingAssetLink}
          onCopanyUpdate={onCopanyUpdate}
        />
      </div>
    );
  }

  function connectSection() {
    return (
      <div className="flex flex-col gap-3 max-w-screen-sm">
        {/* <div className="flex flex-row gap-2 items-center px-3 py-2 rounded-md w-full justify-between border border-gray-200 dark:border-gray-800">
          <div className="flex flex-row gap-2 items-center">
            <Image
              src={isDarkMode ? GithubDarkIcon : GithubIcon}
              alt="GitHub"
              className="w-8 h-8 rounded-md p-2 bg-gray-100 dark:bg-gray-900"
              width={32}
              height={32}
            />
            <div className="flex flex-col gap-0">
              <p className="text-base font-medium">GitHub</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Link pull requests to your copany
              </p>
            </div>
          </div>
          <Button
            className="w-fit"
            variant="ghost"
            onClick={() => {
              const stateObj = {
                copany_id: copany.id,
                copany_name: copany.name,
              };
              const state = encodeURIComponent(btoa(JSON.stringify(stateObj)));
              window.open(
                `https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME}/installations/new?state=${state}`,
                "_blank"
              );
            }}
          >
            <div className="flex flex-row gap-2 items-center">
              {copany.is_connected_github && (
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              )}
              <p className="text-base font-medium">
                {copany.is_connected_github ? "Connected" : "Connect"}
              </p>
              {copany.is_connected_github ? (
                <Cog6ToothIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ArrowUpRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </div>
          </Button>
        </div> */}
        <div className="flex flex-row gap-2 items-center px-3 py-2 rounded-lg w-full justify-between border border-gray-200 dark:border-gray-700">
          <div className="flex flex-row gap-2 items-center">
            <Image
              src={AppleAppStoreConnectLogo}
              alt="App Store Connect"
              className="w-8 h-8"
              width={32}
              height={32}
            />
            <div className="flex flex-col gap-0">
              <p className="text-base font-medium">App Store Connect</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Fetch finance reports from App Store Connect
              </p>
            </div>
          </div>
          <ConnectToAppStoreConnect
            copanyId={copany.id}
            showIcon={false}
            buttonText="Connect"
            onSuccess={async () => {
              // Refresh copany data after successful connection
              queryClient.invalidateQueries({
                queryKey: ["copany", copany.id],
              });
            }}
          />
        </div>
      </div>
    );
  }

  function deleteCopanySection() {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between max-w-screen-sm p-4 rounded-lg border border-1.5 border-red-500">
        <div className="flex flex-col gap-1">
          <label className="text-base font-semibold ">Delete Copany</label>
          <p className="text-sm">
            Once you delete a copany, there is no going back. Please be certain.
          </p>
        </div>

        <Button
          className="w-fit h-fit"
          onClick={() => setIsDeleteModalOpen(true)}
          variant="danger"
        >
          Delete this Copany
        </Button>
      </div>
    );
  }
}
