"use client";

import { useState } from "react";
import Image from "next/image";
import { useUserInfo } from "@/hooks/userInfo";
import { useCurrentUser } from "@/hooks/currentUser";
import { useHasProviders } from "@/hooks/userAuth";
import { useDarkMode } from "@/utils/useDarkMode";
import LoadingView from "@/components/commons/LoadingView";
import { AtSymbolIcon } from "@heroicons/react/24/outline";
import { signInWithGitHub, signInWithGoogle } from "@/actions/auth.actions";
import googleIcon from "@/assets/google_logo.webp";
import githubIconBlack from "@/assets/github_logo.svg";
import githubIconWhite from "@/assets/github_logo_dark.svg";
import Button from "@/components/commons/Button";
import { updateUserNameAction } from "@/actions/user.actions";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export default function AccountView({ userId }: { userId: string }) {
  const { data: user, isLoading } = useUserInfo(userId);
  const { data: currentUser } = useCurrentUser();
  const { data: providersInfo, isLoading: providersLoading } =
    useHasProviders();
  const isDarkMode = useDarkMode();
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [userName, setUserName] = useState("");
  const queryClient = useQueryClient();
  const router = useRouter();

  // Check if current user is viewing their own profile
  const isOwnProfile = currentUser?.id === userId;

  // Get user's linked providers info
  const hasGitHub = providersInfo?.hasGitHub || false;
  const hasGoogle = providersInfo?.hasGoogle || false;
  // const hasEmail = providersInfo?.hasEmail || false; // Unused for now
  const linkedProviders = providersInfo?.allProviders || [];
  const providersData = providersInfo?.providersData || [];

  // Initialize user name when user data is loaded
  if (user && !userName) {
    setUserName(user.name);
  }

  const handleRenameUser = async () => {
    if (!userName.trim()) return;

    setIsRenaming(true);
    try {
      const result = await updateUserNameAction(userId, userName.trim());
      if (result.success) {
        // Refresh user data
        queryClient.invalidateQueries({ queryKey: ["userInfo", userId] });
        // Refresh the page to ensure the name is updated everywhere
        router.refresh();
      } else {
        alert(
          result.error || "Failed to update user name, please try again later"
        );
      }
    } catch (error) {
      console.error("Failed to update user name:", error);
      alert("Failed to update user name, please try again later");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleGitHubLogin = async () => {
    if (!isOwnProfile) return;
    setIsGitHubLoading(true);
    try {
      await signInWithGitHub();
    } catch (error) {
      console.error("GitHub login failed:", error);
      setIsGitHubLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isOwnProfile) return;
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google login failed:", error);
      setIsGoogleLoading(false);
    }
  };

  if (isLoading || providersLoading) {
    return <LoadingView type="label" />;
  }
  if (!user) {
    return <div className="p-8 max-w-[820px] mx-auto">User not found</div>;
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <p className="text-2xl font-bold">General</p>
        {/* Rename User Section */}
        <div className="flex flex-col gap-3 max-w-full">
          <label htmlFor="userName" className="text-sm font-semibold">
            User name
          </label>
          <div className="flex flex-row gap-3 max-w-full">
            <input
              type="text"
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 max-w-full rounded-md px-2 py-1"
              placeholder="Enter new name"
            />
            <Button onClick={handleRenameUser} disabled={isRenaming}>
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-base font-semibold">Email</p>
          <p>{user.email}</p>
        </div>
        <p className="text-2xl font-semibold">Linked Accounts</p>
        <div className="flex flex-col gap-3">
          {linkedProviders.length > 0 ? (
            <div className="flex flex-col gap-3">
              {providersData.map((providerData, index) => (
                <div
                  key={`${providerData.provider}-${index}`}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {providerData.provider === "github" && (
                      <div className="flex flex-row gap-1 items-center">
                        <Image
                          className="w-4 h-4"
                          alt="GitHub Logo"
                          src={isDarkMode ? githubIconWhite : githubIconBlack}
                          width={16}
                          height={16}
                        />
                        <span className="font-semibold">GitHub Account</span>
                        <div className="flex flex-row gap-1 items-center pl-2">
                          {providerData.user_name && (
                            <span className="text-gray-500">
                              @{providerData.user_name}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {providerData.provider === "google" && (
                      <div className="flex flex-row gap-1 items-center">
                        <Image
                          className="w-4 h-4"
                          alt="Google Logo"
                          src={googleIcon}
                          width={16}
                          height={16}
                        />
                        <span className="font-semibold">Google Account</span>
                        <div className="flex flex-row gap-1 items-center pl-2">
                          {providerData.user_name && (
                            <span className="text-gray-500">
                              @{providerData.user_name}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {providerData.provider === "email" && (
                      <div className="flex flex-row gap-1 items-center">
                        <AtSymbolIcon className="w-4 h-4" strokeWidth={2} />
                        <span className="font-semibold">Email</span>
                        <div className="flex flex-row gap-1 items-center pl-2">
                          {providerData.email && (
                            <span className="text-gray-500">
                              {providerData.email}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No linked accounts</p>
          )}
        </div>
      </div>

      {isOwnProfile && !(hasGitHub && hasGoogle) && (
        <div className="flex flex-col gap-5">
          <p className="text-2xl font-bold">Link to Accounts</p>
          <div className="flex flex-col gap-3 max-w-[240px]">
            {!hasGitHub && (
              <button
                type="button"
                onClick={handleGitHubLogin}
                disabled={isEmailLoading || isGitHubLoading || isGoogleLoading}
                className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-800 dark:border-gray-200 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 font-medium text-sm hover:opacity-90 transition-opacity hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Image
                  className="w-4 h-4"
                  alt="GitHub Logo"
                  src={isDarkMode ? githubIconBlack : githubIconWhite}
                  width={16}
                  height={16}
                />
                <span className="whitespace-nowrap">
                  {isGitHubLoading ? "Linking..." : "Link with GitHub"}
                </span>
              </button>
            )}

            {!hasGoogle && (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isEmailLoading || isGitHubLoading || isGoogleLoading}
                className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Image
                  className="w-4 h-4"
                  alt="Google Logo"
                  src={googleIcon}
                  width={16}
                  height={16}
                />
                <span className="whitespace-nowrap">
                  {isGoogleLoading ? "Linking..." : "Link with Google"}
                </span>
              </button>
            )}
            {hasGitHub && hasGoogle && (
              <p className="text-green-600 text-sm text-center mt-2">
                All supported accounts are linked
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
