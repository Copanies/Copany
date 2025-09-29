"use client";

import { useState } from "react";
import Image from "next/image";
import { useUserInfo } from "@/hooks/userInfo";
import { useCurrentUser } from "@/hooks/currentUser";
import { useHasProviders } from "@/hooks/userAuth";
import { useDarkMode } from "@/utils/useDarkMode";
import LoadingView from "@/components/commons/LoadingView";
import { AtSymbolIcon } from "@heroicons/react/24/outline";
import {
  signInWithGitHub,
  signInWithGoogle,
  signInWithFigma,
} from "@/actions/auth.actions";
import googleIcon from "@/assets/google_logo.webp";
import githubIconBlack from "@/assets/github_logo.svg";
import githubIconWhite from "@/assets/github_logo_dark.svg";
import figmaIcon from "@/assets/figma_logo.svg";
import alipayIcon from "@/assets/alipay_logo.svg";
import wiseIcon from "@/assets/wise_logo.png";
import Button from "@/components/commons/Button";
import { updateUserNameAction } from "@/actions/user.actions";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  usePaymentLinkByType,
  useUpsertPaymentLink,
  useDeletePaymentLink,
} from "@/hooks/receivePaymentLinks";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function AccountView({ userId }: { userId: string }) {
  const { data: user, isLoading } = useUserInfo(userId);
  const { data: currentUser } = useCurrentUser();
  const { data: providersInfo, isLoading: providersLoading } =
    useHasProviders();
  const isDarkMode = useDarkMode();
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFigmaLoading, setIsFigmaLoading] = useState(false);
  const [isEmailLoading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [userName, setUserName] = useState("");
  const queryClient = useQueryClient();
  const router = useRouter();

  // Payment links state
  const [wiseLink, setWiseLink] = useState("");
  const [alipayLink, setAlipayLink] = useState("");
  const [showWiseLink, setShowWiseLink] = useState(false);
  const [showAlipayLink, setShowAlipayLink] = useState(false);
  const [isWiseLoading, setIsWiseLoading] = useState(false);
  const [isAlipayLoading, setIsAlipayLoading] = useState(false);

  // Payment links hooks
  const { data: wisePaymentLink } = usePaymentLinkByType(userId, "Wise");
  const { data: alipayPaymentLink } = usePaymentLinkByType(userId, "Alipay");
  const upsertPaymentLinkMutation = useUpsertPaymentLink();
  const deletePaymentLinkMutation = useDeletePaymentLink();

  // Check if current user is viewing their own profile
  const isOwnProfile = currentUser?.id === userId;

  // Get user's linked providers info
  const hasGitHub = providersInfo?.hasGitHub || false;
  const hasGoogle = providersInfo?.hasGoogle || false;
  const hasFigma = providersInfo?.hasFigma || false;
  // const hasEmail = providersInfo?.hasEmail || false; // Unused for now
  const linkedProviders = providersInfo?.allProviders || [];
  const providersData = providersInfo?.providersData || [];

  // Initialize user name when user data is loaded
  if (user && !userName) {
    setUserName(user.name);
  }

  // Initialize payment links when data is loaded
  if (wisePaymentLink && !wiseLink) {
    setWiseLink(wisePaymentLink.decrypted_link);
  }
  if (alipayPaymentLink && !alipayLink) {
    setAlipayLink(alipayPaymentLink.decrypted_link);
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

  const handleFigmaLogin = async () => {
    if (!isOwnProfile) return;
    setIsFigmaLoading(true);
    try {
      await signInWithFigma();
    } catch (error) {
      console.error("Figma login failed:", error);
      setIsFigmaLoading(false);
    }
  };

  const handleSaveWiseLink = async () => {
    if (!isOwnProfile || !wiseLink.trim()) return;

    // Validate Wise link format
    const wisePattern = /^https:\/\/wise\.com\/pay\/me\/.+$/;
    if (!wisePattern.test(wiseLink.trim())) {
      alert(
        "Invalid Wise link format. Please use: https://wise.com/pay/me/XXX"
      );
      return;
    }

    setIsWiseLoading(true);
    try {
      await upsertPaymentLinkMutation.mutateAsync({
        userId,
        type: "Wise",
        paymentLink: wiseLink.trim(),
      });
      alert("Wise payment link saved successfully");
    } catch (error) {
      console.error("Failed to save Wise link:", error);
      alert("Failed to save Wise payment link, please try again");
    } finally {
      setIsWiseLoading(false);
    }
  };

  const handleSaveAlipayLink = async () => {
    if (!isOwnProfile || !alipayLink.trim()) return;

    // Validate Alipay link format
    const alipayPattern = /^https:\/\/qr\.alipay\.com\/.+$/;
    if (!alipayPattern.test(alipayLink.trim())) {
      alert(
        "Invalid Alipay link format. Please use: https://qr.alipay.com/XXX"
      );
      return;
    }

    setIsAlipayLoading(true);
    try {
      await upsertPaymentLinkMutation.mutateAsync({
        userId,
        type: "Alipay",
        paymentLink: alipayLink.trim(),
      });
      alert("Alipay payment link saved successfully");
    } catch (error) {
      console.error("Failed to save Alipay link:", error);
      alert("Failed to save Alipay payment link, please try again");
    } finally {
      setIsAlipayLoading(false);
    }
  };

  const handleDeleteWiseLink = async () => {
    if (!isOwnProfile || !wisePaymentLink) return;

    if (!confirm("Are you sure you want to delete the Wise payment link?"))
      return;

    try {
      await deletePaymentLinkMutation.mutateAsync({
        userId,
        type: "Wise",
      });
      setWiseLink("");
      alert("Wise payment link deleted successfully");
    } catch (error) {
      console.error("Failed to delete Wise link:", error);
      alert("Failed to delete Wise payment link, please try again");
    }
  };

  const handleDeleteAlipayLink = async () => {
    if (!isOwnProfile || !alipayPaymentLink) return;

    if (!confirm("Are you sure you want to delete the Alipay payment link?"))
      return;

    try {
      await deletePaymentLinkMutation.mutateAsync({
        userId,
        type: "Alipay",
      });
      setAlipayLink("");
      alert("Alipay payment link deleted successfully");
    } catch (error) {
      console.error("Failed to delete Alipay link:", error);
      alert("Failed to delete Alipay payment link, please try again");
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

        {/* Receive Payments Section */}
        {isOwnProfile && (
          <div className="flex flex-col gap-5">
            <p className="text-2xl font-bold">Receive Payments</p>

            {/* Wise Payment Link */}
            <div className="flex flex-col gap-3 max-w-full">
              <div className="flex flex-row gap-3 items-center">
                <Image src={wiseIcon} alt="Wise Logo" width={66} height={35} />
                <label htmlFor="wiseLink" className="text-sm font-semibold">
                  Wise Payment Link
                </label>
              </div>
              <div className="flex flex-row gap-3 max-w-full items-center">
                <div className="relative flex-1 max-w-[400px]">
                  <input
                    type={showWiseLink ? "text" : "password"}
                    id="wiseLink"
                    value={wiseLink}
                    onChange={(e) => setWiseLink(e.target.value)}
                    className="border border-gray-300 dark:border-gray-700 w-full rounded-md px-2 py-1 pr-10"
                    placeholder={wisePaymentLink ? "****" : "Enter"}
                  />
                  {wiseLink && (
                    <button
                      type="button"
                      onClick={() => setShowWiseLink(!showWiseLink)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:cursor-pointer"
                    >
                      {showWiseLink ? (
                        <EyeSlashIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                <Button
                  onClick={handleSaveWiseLink}
                  disabled={isWiseLoading || !wiseLink.trim()}
                >
                  {isWiseLoading ? "Saving..." : "Save"}
                </Button>
                {wisePaymentLink && (
                  <Button onClick={handleDeleteWiseLink} variant="secondary">
                    Delete
                  </Button>
                )}
              </div>
              <p className="text-sm">How to get your link?</p>
            </div>

            {/* Alipay QR Code Link */}
            <div className="flex flex-col gap-3 max-w-full">
              <div className="flex flex-row gap-3 items-center">
                <Image
                  src={alipayIcon}
                  alt="Alipay Logo"
                  width={83.61}
                  height={35}
                />
                <label htmlFor="alipayLink" className="text-sm font-semibold">
                  Alipay QR Code Link
                </label>
              </div>
              <div className="flex flex-row gap-3 max-w-full items-center">
                <div className="relative flex-1 max-w-[400px]">
                  <input
                    type={showAlipayLink ? "text" : "password"}
                    id="alipayLink"
                    value={alipayLink}
                    onChange={(e) => setAlipayLink(e.target.value)}
                    className="border border-gray-300 dark:border-gray-700 w-full rounded-md px-2 py-1 pr-10"
                    placeholder={alipayPaymentLink ? "****" : "Enter"}
                  />
                  {alipayLink && (
                    <button
                      type="button"
                      onClick={() => setShowAlipayLink(!showAlipayLink)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:cursor-pointer"
                    >
                      {showAlipayLink ? (
                        <EyeSlashIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                <Button
                  onClick={handleSaveAlipayLink}
                  disabled={isAlipayLoading || !alipayLink.trim()}
                >
                  {isAlipayLoading ? "Saving..." : "Save"}
                </Button>
                {alipayPaymentLink && (
                  <Button onClick={handleDeleteAlipayLink} variant="secondary">
                    Delete
                  </Button>
                )}
              </div>
              <p className="text-sm">How to get your link?</p>
            </div>
          </div>
        )}

        <p className="text-2xl font-semibold">Accounts</p>
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">Linked Accounts</p>
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
                        <span className="font-base">GitHub Account</span>
                        <div className="flex flex-row gap-1 items-center pl-2">
                          {providerData.user_name && (
                            <Link
                              href={`https://github.com/${providerData.user_name}`}
                              className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:underline"
                            >
                              @{providerData.user_name}
                            </Link>
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
                        <span className="font-base">Google Account</span>
                        <div className="flex flex-row gap-1 items-center pl-2">
                          {providerData.user_name && (
                            <span className="text-gray-500">
                              @{providerData.user_name}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {providerData.provider === "figma" && (
                      <div className="flex flex-row gap-1 items-center">
                        <Image
                          className="w-4 h-4"
                          alt="Figma Logo"
                          src={figmaIcon}
                          width={16}
                          height={16}
                        />
                        <span className="font-base">Figma Account</span>
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
                        <span className="font-base">Email</span>
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

      {isOwnProfile && !(hasGitHub && hasGoogle && hasFigma) && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Link to Accounts</p>
            <p className="text-gray-500 text-sm">
              Only supports linking to GitHub, Google, or Figma accounts with
              the same email address
            </p>
          </div>
          <div className="flex flex-col gap-3 max-w-[240px]">
            {!hasGitHub && (
              <button
                type="button"
                onClick={handleGitHubLogin}
                disabled={
                  isEmailLoading ||
                  isGitHubLoading ||
                  isGoogleLoading ||
                  isFigmaLoading
                }
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
                disabled={
                  isEmailLoading ||
                  isGitHubLoading ||
                  isGoogleLoading ||
                  isFigmaLoading
                }
                className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-800 dark:border-gray-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

            {!hasFigma && (
              <button
                type="button"
                onClick={handleFigmaLogin}
                disabled={
                  isEmailLoading ||
                  isGitHubLoading ||
                  isGoogleLoading ||
                  isFigmaLoading
                }
                className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-800 dark:border-gray-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Image
                  className="w-4 h-4"
                  alt="Figma Logo"
                  src={figmaIcon}
                  width={16}
                  height={16}
                />
                <span className="whitespace-nowrap">
                  {isFigmaLoading ? "Linking..." : "Link with Figma"}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
