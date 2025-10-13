"use client";

import { updateCopanyAction } from "@/actions/copany.actions";
import Button from "@/components/commons/Button";
import { Copany } from "@/types/database.types";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import Modal from "@/components/commons/Modal";
import Dropdown from "@/components/commons/Dropdown";
import { useDarkMode } from "@/utils/useDarkMode";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EMPTY_STRING } from "@/utils/constants";

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
      // 更新本地状态
      onCopanyUpdate(updatedCopany);

      // 失效相关查询
      queryClient.invalidateQueries({ queryKey: ["copany", copany.id] });
      queryClient.invalidateQueries({ queryKey: ["copanies"] });

      // 设置查询数据以保持 UI 同步 - 使用正确的查询键
      queryClient.setQueryData(["copany", copany.id], updatedCopany);

      // 重置状态并关闭弹窗
      setAssetType(null);
      setAssetLink(null);
      onClose();
    },
    onError: (error) => {
      console.error("Failed to update copany asset link:", error);
    },
  });

  // 稳定 mutation 的可变方法
  const mutateAsyncRef = useRef(updateCopanyAssetLinkMutation.mutateAsync);

  // 同步 ref 中的最新函数
  if (updateCopanyAssetLinkMutation.mutateAsync !== mutateAsyncRef.current) {
    mutateAsyncRef.current = updateCopanyAssetLinkMutation.mutateAsync;
  }

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
        // 重置状态
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
          <p className="text-sm font-semibold">Asset type</p>
          {isEditMode && assetType !== null ? (
            <div className="flex flex-row gap-2 items-center border border-gray-300 dark:border-gray-700 rounded-md p-2 w-full bg-gray-50 dark:bg-gray-800">
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
                className="w-5 h-5"
                width={20}
                height={20}
                placeholder="blur"
                blurDataURL={shimmerDataUrlWithTheme(20, 20, isDarkMode)}
              />
              <p className="text-sm font-semibold w-full text-left">
                {assetLinks.find((link) => link.id === assetType)?.label || ""}
              </p>
            </div>
          ) : (
            <Dropdown
              className="w-full"
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
                        <label className="text-sm font-semibold">
                          {link.label}
                        </label>
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
                  <div className="flex flex-row gap-2 items-center border border-gray-300 dark:border-gray-700 rounded-md p-2">
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
                      className="w-5 h-5"
                      width={20}
                      height={20}
                      placeholder="blur"
                      blurDataURL={shimmerDataUrlWithTheme(20, 20, isDarkMode)}
                    />
                    <label
                      htmlFor="assetType"
                      className="text-sm font-semibold text-left cursor-pointer"
                    >
                      {assetLinks.find((link) => link.id === assetType)?.label}
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
            value={assetLink || EMPTY_STRING}
            onChange={(e) => {
              setAssetLink(e.target.value);
            }}
          />
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
            disabled={assetType === null || !assetLink || isLoading}
            onClick={() => {
              if (assetType !== null) {
                updateCopanyAssetLinkAction(assetType, assetLink || "");
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
