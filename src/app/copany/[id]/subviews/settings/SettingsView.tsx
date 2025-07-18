"use client";

import {
  updateCopanyAction,
  deleteCopanyAction,
} from "@/actions/copany.actions";
import Button from "@/components/commons/Button";
import Modal from "@/components/commons/Modal";
import { Copany } from "@/types/database.types";
import { useState, useRef, useMemo } from "react";
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
import { useDarkMode } from "@/utils/useDarkMode";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/solid";
import AssetLinkModal from "./AssetLinkModal";
import { storageService } from "@/services/storage.service";
import { useRouter } from "next/navigation";
import { CopanyManager } from "@/utils/cache";

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
  const [description, setDescription] = useState(copany.description || "");
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

  // Delete Copany related states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Update Description related states
  const [isUpdatingDescription, setIsUpdatingDescription] = useState(false);

  // Create a memoized CopanyManager instance with callback for real-time updates
  const copanyManager = useMemo(() => {
    return new CopanyManager((key, updatedData) => {
      console.log(`[SettingsView] 后台数据更新: ${key}`, updatedData);
      // Update the copany data when background refresh occurs
      onCopanyUpdate(updatedData);
    });
  }, [onCopanyUpdate]);

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
      await updateCopanyAction(updatedCopany);
      copanyManager.setCopany(copany.id, updatedCopany);
      onCopanyUpdate(updatedCopany);
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
      await updateCopanyAction(updatedCopany);
      copanyManager.setCopany(copany.id, updatedCopany);
      onCopanyUpdate(updatedCopany);
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
    const maxSize = storageService.getMaxFileSize();
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
      const result = await storageService.uploadLogo(file, copany.name);

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
      // Clear file input to allow reselecting the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle delete Copany
  async function handleDeleteCopany() {
    setIsDeleting(true);
    try {
      await deleteCopanyAction(copany.id);
      // Redirect to home page after successful deletion
      router.push("/");
    } catch (error) {
      console.error("Failed to delete Copany:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  // Close delete modal
  function handleCloseDeleteModal() {
    setIsDeleteModalOpen(false);
    setDeleteConfirmName("");
  }

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">General</h1>
        <div className="flex flex-col gap-2">{renameSection()}</div>
        <div className="flex flex-col gap-2">{descriptionSection()}</div>
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
              className="w-full px-3 py-2 rounded-md border-1 border-red-500 dark:border-red-700 bg-transparent dark:text-gray-100"
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

  function descriptionSection() {
    return (
      <div className="flex flex-col gap-3 max-w-full">
        <label className="text-sm font-semibold">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 max-w-lg rounded-md px-2 py-1"
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
        <label className="text-sm font-semibold">Copany logo</label>

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

            {/* Error message */}
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
