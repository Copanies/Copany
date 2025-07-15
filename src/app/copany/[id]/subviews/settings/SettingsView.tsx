"use client";

import { updateCopanyAction } from "@/actions/copany.actions";
import Button from "@/components/commons/Button";
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

interface SettingsViewProps {
  copany: Copany;
  onCopanyUpdate: (copany: Copany) => void;
}

export default function SettingsView({
  copany,
  onCopanyUpdate,
}: SettingsViewProps) {
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
      // 如果已经有上传的 logo，先删除它
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

      // 上传新的 logo
      const result = await storageService.uploadLogo(file, copany.name);

      if (result.success && result.url) {
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">General</h1>
      <div className="flex flex-col gap-2">{renameSection()}</div>
      <div className="flex flex-col gap-2">{logoSection()}</div>
      <h1 className="text-2xl font-bold">Assest links</h1>
      <div className="flex flex-col gap-2">{assetLinksSection()}</div>
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

        <div className="flex flex-col gap-3">
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
}
