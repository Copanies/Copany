"use client";

import { useUserInfo } from "@/hooks/userInfo";
import LoadingView from "@/components/commons/LoadingView";
import Image from "next/image";
import TabView from "@/components/commons/TabView";
import WorkingOnView from "./_subTabs/WorkingOnView";
import AccountView from "./_subTabs/AccountView";
import Dropdown from "@/components/commons/Dropdown";
import Modal from "@/components/commons/Modal";
import {
  Squares2X2Icon,
  UserCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useState, useRef } from "react";
import { generateRandomCatAvatarAction } from "@/actions/avatar.actions";
import {
  updateUserAvatarWithSvgAction,
  updateUserAvatarWithFileAction,
} from "@/actions/avatar.actions";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Button from "@/components/commons/Button";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";

interface UserViewProps {
  userId: string;
}

export default function UserView({ userId }: UserViewProps) {
  const isDarkMode = useDarkMode();
  const { data: user, isLoading: loading } = useUserInfo(userId);
  const [showRandomAvatarModal, setShowRandomAvatarModal] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  if (loading) {
    return <LoadingView type="page" />;
  }
  if (!user) {
    return <div className="p-8 max-w-[820px] mx-auto">User not found</div>;
  }

  console.log(`[UserView] 🚀 Component initialized:`, {
    userId,
    user,
  });

  const handleRandomAvatar = () => {
    setShowRandomAvatarModal(true);
    generateNewAvatar();
  };

  const handleUploadImage = () => {
    fileInputRef.current?.click();
  };

  // Dropdown options configuration
  const dropdownOptions = [
    {
      value: 1,
      label: "Generate Random Avatar",
    },
    {
      value: 2,
      label: "Upload Local Image",
    },
  ];

  const handleDropdownSelect = (value: number) => {
    if (value === 1) {
      handleRandomAvatar();
    } else if (value === 2) {
      // 使用 setTimeout 确保 Dropdown 关闭后再触发文件选择
      setTimeout(() => {
        handleUploadImage();
      }, 10);
    }
  };

  const generateNewAvatar = async () => {
    setIsGenerating(true);
    try {
      const newAvatar = await generateRandomCatAvatarAction();
      setCurrentAvatar(newAvatar);
    } catch (error) {
      console.error("Failed to generate avatar:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await updateUserAvatarWithFileAction(userId, file);
      if (result.success) {
        // Refresh user data
        queryClient.invalidateQueries({ queryKey: ["userInfo", userId] });
        // Refresh the page to ensure the avatar is updated everywhere
        router.refresh();
      } else {
        alert(
          result.error || "Failed to update avatar, please try again later"
        );
      }
    } catch (error) {
      console.error("Failed to update avatar:", error);
      alert("Failed to update avatar, please try again later");
    } finally {
      // 清空文件输入，允许重新选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmRandomAvatar = async () => {
    if (!currentAvatar) return;

    setIsConfirming(true);
    try {
      const result = await updateUserAvatarWithSvgAction(userId, currentAvatar);
      if (result.success) {
        // Refresh user data
        queryClient.invalidateQueries({ queryKey: ["userInfo", userId] });
        // Refresh the page to ensure the avatar is updated everywhere
        router.refresh();
        setShowRandomAvatarModal(false);
      } else {
        alert(
          result.error || "Failed to update avatar, please try again later"
        );
      }
    } catch (error) {
      console.error("Failed to update avatar:", error);
      alert("Failed to update avatar, please try again later");
    } finally {
      setIsConfirming(false);
    }
  };

  const tabs = [
    {
      label: "Account",
      icon: <UserCircleIcon strokeWidth={2} className="w-4 h-4" />,
      content: <AccountView userId={userId} />,
    },
    {
      label: "Working on",
      icon: <Squares2X2Icon strokeWidth={2} className="w-4 h-4" />,
      content: <WorkingOnView userId={userId} />,
    },
  ];

  return (
    <div className="flex flex-col gap-4 max-w-[840px] mx-auto py-6 px-5 min-h-screen">
      <div className="flex flex-row gap-4 items-center">
        {/* Avatar with hover effect and dropdown */}
        <div className="relative inline-block group">
          <Dropdown
            trigger={
              <div className="relative cursor-pointer focus:outline-none">
                <Image
                  src={user.avatar_url}
                  alt={user.name}
                  width={120}
                  height={120}
                  className="rounded-full transition-shadow group-hover:shadow-lg"
                  placeholder="blur"
                  blurDataURL={shimmerDataUrlWithTheme(120, 120, isDarkMode)}
                />
                {/* Hover Overlay, controlled by group-hover */}
                <div className="pointer-events-none absolute inset-0 bg-black/30 dark:bg-gray-800/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-white dark:text-gray-100 text-base font-semibold text-center px-0 text-center">
                    <div>Change avatar</div>
                  </div>
                </div>
              </div>
            }
            options={dropdownOptions}
            selectedValue={null}
            onSelect={handleDropdownSelect}
            showBackground={false}
            size="lg"
            className=""
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-2xl font-bold">{user.name}</div>
          <div className="text-base text-gray-500">{user.email}</div>
        </div>
      </div>

      <div className="-mx-5">
        <TabView tabs={tabs} />
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Random Avatar Modal */}
      <Modal
        isOpen={showRandomAvatarModal}
        onClose={() => setShowRandomAvatarModal(false)}
        size="sm"
      >
        <div className="flex flex-col p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Change Avatar
            </h2>
          </div>

          {/* Avatar Preview */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-[120px] h-[120px] rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center mb-4">
              {currentAvatar ? (
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: currentAvatar }}
                />
              ) : (
                <div className="w-[120px] h-[120px] rounded-full bg-gray-50 dark:bg-gray-700 animate-pulse"></div>
              )}
            </div>

            {/* Generate Button */}
            <Button
              onClick={generateNewAvatar}
              disabled={isGenerating}
              variant="secondary"
              size="md"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Generate
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="w-4 h-4" />
                  Generate
                </div>
              )}
            </Button>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              onClick={handleConfirmRandomAvatar}
              disabled={!currentAvatar || isConfirming}
              variant="primary"
              size="md"
            >
              {isConfirming ? "Confirming..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
