"use client";

import { updateCopanyAction } from "@/actions/copany.actions";
import Button from "@/components/commons/Button";
import { Copany } from "@/types/database.types";
import { copanyManager } from "@/utils/cache";
import { useState, useEffect } from "react";
import GithubIcon from "@/assets/github_logo.svg";
import FigmaIcon from "@/assets/figma_logo.svg";
import TelegramIcon from "@/assets/telegram_logo.svg";
import DiscordIcon from "@/assets/discord_logo.svg";
import NotionIcon from "@/assets/notion_logo.svg";
import GithubDarkIcon from "@/assets/github_logo_dark.svg";
import DiscordDarkIcon from "@/assets/discord_logo_dark.svg";
import NotionDarkIcon from "@/assets/notion_logo_dark.png";
import Image from "next/image";
import { useDarkMode } from "@/utils/useDarkMode";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/solid";
import AssetLinkModal from "./AssetLinkModal";

interface SettingsViewProps {
  copany: Copany;
}

export default function SettingsView({ copany }: SettingsViewProps) {
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

  const assetLinks = [
    {
      label: "Github",
      key: "github_url",
      value: copany.github_url,
      icon: GithubIcon,
      darkIcon: GithubDarkIcon,
      id: 0,
    },
    {
      label: "Figma",
      key: "figma_url",
      value: copany.figma_url,
      icon: FigmaIcon,
      darkIcon: FigmaIcon,
      id: 1,
    },
    {
      label: "Notion",
      key: "notion_url",
      value: copany.notion_url,
      icon: NotionIcon,
      darkIcon: NotionDarkIcon,
      id: 2,
    },
    {
      label: "Telegram",
      key: "telegram_url",
      value: copany.telegram_url,
      icon: TelegramIcon,
      darkIcon: TelegramIcon,
      id: 3,
    },
    {
      label: "Discord",
      key: "discord_url",
      value: copany.discord_url,
      icon: DiscordIcon,
      darkIcon: DiscordDarkIcon,
      id: 4,
    },
  ];

  async function renameCopany() {
    setIsRenaming(true);
    try {
      await updateCopanyAction({
        ...copany,
        name: name,
      });
      copanyManager.setCopany(copany.id, {
        ...copany,
        name: name,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsRenaming(false);
    }
  }

  async function deleteAssetLink(assetType: number) {
    try {
      await updateCopanyAction({
        ...copany,
        [assetLinks[assetType].key]: null,
      });
      copanyManager.setCopany(copany.id, {
        ...copany,
        [assetLinks[assetType].key]: null,
      });
    } catch (error) {
      console.error(error);
    }
  }

  function openEditModal(assetType: number, currentValue: string) {
    setEditingAssetLink({ type: assetType, currentValue });
    setIsEditAssetLinkModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">General</h1>
      <div className="flex flex-col gap-2">{renameSection()}</div>
      <h1 className="text-2xl font-bold">Assest links</h1>
      <div className="flex flex-col gap-2">{assetLinksSection()}</div>
    </div>
  );

  function renameSection() {
    return (
      <div className="flex flex-col gap-3">
        <label htmlFor="name" className="text-sm font-semibold">
          Copany name
        </label>
        <div className="flex flex-row gap-3">
          <input
            type="text"
            id="name"
            value={name}
            className="border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1"
            onChange={(e) => setName(e.target.value)}
          />
          <Button onClick={renameCopany} disabled={isRenaming}>
            {isRenaming ? "Renaming..." : "Rename"}
          </Button>
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
                    <label
                      htmlFor={link.id.toString()}
                      className="text-sm font-semibold text-center"
                    >
                      {link.label}
                    </label>
                  </div>
                  <div className="flex flex-row gap-2">
                    <button
                      onClick={() => openEditModal(link.id, link.value)}
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
                  className="hover:underline"
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
        />
      </div>
    );
  }
}
