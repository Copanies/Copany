"use client";

import { updateCopanyAction } from "@/actions/copany.actions";
import Button from "@/components/commons/Button";
import { Copany } from "@/types/database.types";
import { copanyManager } from "@/utils/cache";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import Modal from "@/components/commons/Modal";
import Dropdown from "@/components/commons/Dropdown";
import { useDarkMode } from "@/utils/useDarkMode";

export default function AssetLinkModal({
  isOpen,
  onClose,
  assetLinks,
  copany,
  editingAssetLink,
  onCopanyUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  assetLinks: {
    key: string;
    label: string;
    value: string;
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
}) {
  const [assetType, setAssetType] = useState<number | null>(null);
  const [assetLink, setAssetLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isEditMode = !!editingAssetLink;
  const isDarkMode = useDarkMode();

  // 当弹窗打开时，设置初始值
  useEffect(() => {
    if (isOpen && editingAssetLink) {
      setAssetType(editingAssetLink.type);
      setAssetLink(editingAssetLink.currentValue);
    } else if (isOpen && !editingAssetLink) {
      setAssetType(null);
      setAssetLink(null);
    }
  }, [isOpen, editingAssetLink]);

  async function updateCopanyAssetLinkAction(
    assetType: number,
    assetLink: string
  ) {
    setIsLoading(true);
    try {
      const updatedCopany = {
        ...copany,
        [assetLinks[assetType].key]: assetLink,
      };
      await updateCopanyAction(updatedCopany);
      copanyManager.setCopany(copany.id, updatedCopany);
      onCopanyUpdate(updatedCopany);
      setAssetType(null);
      setAssetLink(null);
      onClose();
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
        onClose();
      }}
    >
      <div className="flex flex-col gap-5">
        <h1 className="text-lg font-bold px-8 pt-8">
          {isEditMode ? "Edit asset link" : "Add asset link"}
        </h1>
        <div className="flex flex-col gap-3 px-8">
          <p className="text-sm font-semibold">Asset type</p>
          {isEditMode ? (
            <div className="flex flex-row gap-2 items-center border border-gray-300 dark:border-gray-700 rounded-md p-2 w-full bg-gray-50 dark:bg-gray-800">
              <Image
                src={
                  isDarkMode
                    ? assetLinks[assetType || 0].darkIcon
                    : assetLinks[assetType || 0].icon
                }
                alt={assetLinks[assetType || 0].label || ""}
                className="w-5 h-5"
              />
              <p className="text-sm font-semibold w-full text-left">
                {assetLinks[assetType || 0].label}
              </p>
            </div>
          ) : (
            <Dropdown
              className="w-full"
              options={assetLinks
                .filter((link) => copany[link.key as keyof Copany] == null)
                .map((link) => {
                  return {
                    value: Number(link.id),
                    label: (
                      <div className="flex flex-row gap-2 items-center">
                        <Image
                          src={isDarkMode ? link.darkIcon : link.icon}
                          alt={link.label || ""}
                          className="w-5 h-5"
                        />
                        <label className="text-sm font-semibold">
                          {link.label}
                        </label>
                      </div>
                    ),
                  };
                })}
              onSelect={(value) => {
                setAssetType(assetLinks[value].id);
              }}
              selectedValue={assetType ? Number(assetType) : null}
              trigger={
                assetType ? (
                  <div className="flex flex-row gap-2 items-center border border-gray-300 dark:border-gray-700 rounded-md p-2">
                    <Image
                      src={
                        isDarkMode
                          ? assetLinks[assetType || 0].darkIcon
                          : assetLinks[assetType || 0].icon
                      }
                      alt={assetLinks[assetType || 0].label || ""}
                      className="w-5 h-5"
                    />
                    <label
                      htmlFor="assetType"
                      className="text-sm font-semibold text-left cursor-pointer"
                    >
                      {assetLinks[assetType || 0].label}
                    </label>
                    <ChevronDownIcon className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="flex flex-row gap-2 items-center border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1">
                    <label className="text-base text-gray-500 cursor-pointer text-left">
                      Select asset type
                    </label>
                    <ChevronDownIcon className="w-5 h-5" />
                  </div>
                )
              }
            />
          )}
          <p className="text-sm font-semibold">Asset link</p>
          <input
            type="text"
            id="assetLink"
            className="border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1"
            placeholder="https://example.com"
            value={assetLink || ""}
            onChange={(e) => {
              setAssetLink(e.target.value);
            }}
          />
        </div>
        <div className="flex flex-row gap-2 justify-end px-8 pb-8">
          <Button
            onClick={() => {
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={!assetType || !assetLink || isLoading}
            onClick={() => {
              updateCopanyAssetLinkAction(assetType || -1, assetLink || "");
            }}
          >
            {isLoading
              ? isEditMode
                ? "Updating..."
                : "Adding..."
              : isEditMode
              ? "Update"
              : "Add"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
