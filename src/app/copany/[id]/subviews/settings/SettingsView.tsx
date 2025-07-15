"use client";

import {
  updateCopanyAction,
  deleteCopanyAction,
} from "@/actions/copany.actions";
import Button from "@/components/commons/Button";
import Modal from "@/components/commons/Modal";
import { Copany } from "@/types/database.types";
import { copanyManager } from "@/utils/cache";
import { useState, useRef } from "react";
import GithubIcon from "@/assets/github_logo.svg";
import FigmaIcon from "@/assets/figma_logo.svg";
import TelegramIcon from "@/assets/telegram_logo.svg";
import DiscordIcon from "@/assets/discord_logo.svg";
import NotionIcon from "@/assets/notion_logo.png";
import GithubDarkIcon from "@/assets/github_logo_dark.svg";
import DiscordDarkIcon from "@/assets/discord_logo_dark.svg";
import NotionDarkIcon from "@/assets/notion_logo_dark.png";
import Image from "next/image";
import { useDarkMode } from "@/utils/useDarkMode";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/solid";
import AssetLinkModal from "./AssetLinkModal";
import { storageService } from "@/services/storage.service";
import { useRouter } from "next/navigation";

interface SettingsViewProps {
  copany: Copany;
  onCopanyUpdate: (copany: Copany) => void;
}

export default function SettingsView({
  copany,
  onCopanyUpdate,
}: SettingsViewProps) {
  const router = useRouter();
  const isDarkMode = useDarkMode();
  const [name, setName] = useState(copany.name);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isAddAssetLinkModalOpen, setIsAddAssetLinkModalOpen] = useState(false);
  const [isEditAssetLinkModalOpen, setIsEditAssetLinkModalOpen] =
    useState(false);
  const [editingAssetLink, setEditingAssetLink] = useState<{
    type: number;
    currentValue: string;
  } | null>(null);

  // Logo 相关状态
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 删除 Copany 相关状态
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
  ];

  async function renameCopany() {
    setIsRenaming(true);
    try {
      const updatedCopany = {
        ...copany,
        name: name,
      };
      await updateCopanyAction(updatedCopany);
      copanyManager.setCopany(copany.id, updatedCopany);
      onCopanyUpdate(updatedCopany);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRenaming(false);
    }
  }

  async function deleteAssetLink(assetType: number) {
    try {
      const updatedCopany = {
        ...copany,
        [assetLinks.find((link) => link.id === assetType)?.key || ""]: null,
      };
      await updateCopanyAction(updatedCopany);
      copanyManager.setCopany(copany.id, updatedCopany);
      onCopanyUpdate(updatedCopany);
    } catch (error) {
      console.error(error);
    }
  }

  function openEditModal(assetType: number, currentValue: string) {
    setEditingAssetLink({ type: assetType, currentValue });
    setIsEditAssetLinkModalOpen(true);
  }

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

  // 处理 logo 文件选择和上传
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

    // 清除错误并开始上传
    setUploadError(null);
    setIsUploading(true);

    try {
      // 先上传新的 logo
      const result = await storageService.uploadLogo(file, copany.name);

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

        // 立即更新 copany 的 logo_url
        const updatedCopany = {
          ...copany,
          logo_url: result.url,
        };
        await updateCopanyAction(updatedCopany);
        copanyManager.setCopany(copany.id, updatedCopany);
        onCopanyUpdate(updatedCopany);
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

  // 处理删除 Copany
  async function handleDeleteCopany() {
    setIsDeleting(true);
    try {
      await deleteCopanyAction(copany.id);
      // 删除成功后跳转到首页
      router.push("/");
    } catch (error) {
      console.error("删除 Copany 失败:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  // 关闭删除弹窗
  function handleCloseDeleteModal() {
    setIsDeleteModalOpen(false);
    setDeleteConfirmName("");
  }

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">General</h1>
        <div className="flex flex-col gap-2">{renameSection()}</div>
        <div className="flex flex-col gap-2">{logoSection()}</div>
      </div>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Assest links</h1>
        <div className="flex flex-col gap-2">{assetLinksSection()}</div>
      </div>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Danger Zone</h1>
        <div className="flex flex-col gap-2">{deleteCopanySection()}</div>
      </div>

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        size="md"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Delete {copany.name}
          </h2>

          {/* Copany 信息展示 */}
          <div className="flex flex-col items-center gap-3 mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            {copany.logo_url ? (
              <Image
                src={copany.logo_url}
                alt={copany.name}
                width={96}
                height={96}
                className="w-24 h-24 rounded-lg"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <span className="text-gray-400 text-xs">No Logo</span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900 text-center dark:text-gray-100">
                {copany.name}
              </h3>
              {copany.description && (
                <p className="text-sm text-gray-500 text-center dark:text-gray-400">
                  {copany.description}
                </p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              To confirm, type{" "}
              <span className="font-semibold">&quot;{copany.name}&quot;</span>{" "}
              in the box below
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border-1 border-red-500 dark:border-red-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex w-full">
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteCopany}
              disabled={deleteConfirmName !== copany.name || isDeleting}
              className="w-full"
            >
              <p className="text-red-500 font-medium w-full">
                {isDeleting ? "Deleting..." : "Delete this Copany"}
              </p>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );

  function renameSection() {
    return (
      <div className="flex flex-col gap-3 max-w-full">
        <label htmlFor="name" className="text-sm font-semibold">
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

  function logoSection() {
    const currentLogoUrl = uploadedLogoUrl || copany.logo_url;

    return (
      <div className="flex flex-col gap-3 max-w-full">
        <label className="text-sm font-semibold">Copany logo</label>

        <div className="flex flex-col space-y-3">
          {/* Logo 展示区域 */}
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
              variant="secondary"
              size="sm"
              className="w-fit"
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
      </div>
    );
  }

  function assetLinksSection() {
    return (
      <div className="flex flex-col gap-5">
        {assetLinks.map((link) => {
          if (link.value) {
            return (
              <div className="flex flex-col gap-2" key={link.id}>
                <div className="flex flex-row gap-3 items-center" key={link.id}>
                  <div className="flex flex-row gap-1 items-center">
                    <Image
                      src={isDarkMode ? link.darkIcon : link.icon}
                      alt={link.label || ""}
                      className="w-5 h-5"
                    />
                    <p className="text-sm font-semibold text-center">
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
                  className="hover:underline inline-block break-all max-w-full"
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

  function deleteCopanySection() {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold">Delete Copany</label>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Once you delete a copany, there is no going back. Please be certain.
          </p>
        </div>

        <Button
          className="w-fit"
          onClick={() => setIsDeleteModalOpen(true)}
          size="sm"
        >
          <p className="text-red-500 font-medium">Delete this Copany</p>
        </Button>
      </div>
    );
  }
}
