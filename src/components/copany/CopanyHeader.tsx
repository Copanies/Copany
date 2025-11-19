"use client";

import { useState } from "react";
import { Copany } from "@/types/database.types";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import { useQueryClient } from "@tanstack/react-query";
import AssetLinksSection from "@/components/copany/AssetLinksSection";
import { EMPTY_STRING } from "@/utils/constants";
import StarButton from "@/components/copany/StarButton";
import AssetLinkModal from "@/app/copany/[id]/_subTabs/settings/AssetLinkModal";
import GithubIcon from "@/assets/github_logo.svg";
import GithubDarkIcon from "@/assets/github_logo_dark.svg";

interface CopanyHeaderProps {
  copany: Copany;
  showCoverImage?: boolean;
}

export default function CopanyHeader({
  copany,
  showCoverImage = false,
}: CopanyHeaderProps) {
  const isDarkMode = useDarkMode();
  const [isConnectRepoModalOpen, setIsConnectRepoModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Count the number of asset links
  const countAssetLinks = () => {
    let count = 0;
    if (copany.apple_app_store_url) count++;
    if (copany.google_play_store_url) count++;
    if (copany.website_url) count++;
    if (copany.discord_url) count++;
    if (copany.telegram_url) count++;
    if (copany.notion_url) count++;
    if (copany.figma_url) count++;
    if (copany.github_url) count++;
    return count;
  };

  const assetLinksCount = countAssetLinks();
  const shouldShowInlineOnMobile = assetLinksCount <= 2;

  // Handle connect repo button click
  const handleConnectRepo = () => {
    setIsConnectRepoModalOpen(true);
  };

  // Handle copany update from modal
  const handleCopanyUpdate = (updatedCopany: Copany) => {
    // Update React Query cache to keep UI in sync
    queryClient.setQueryData(["copany", copany.id], updatedCopany);
    queryClient.invalidateQueries({
      queryKey: ["copany", copany.id],
    });
    queryClient.invalidateQueries({ queryKey: ["copanies"] });
  };

  return (
    <>
      <div
        className={`flex flex-col gap-4 pb-3 border-b border-gray-200 dark:border-gray-700 ${
          copany.cover_image_url && showCoverImage ? "pt-0" : "pt-6"
        }`}
      >
        {/* Cover image section */}
        {copany.cover_image_url && showCoverImage && (
          <div className="relative w-full aspect-[5]">
            <Image
              src={copany.cover_image_url}
              alt={`${copany.name} cover image`}
              fill
              className="object-cover w-full h-full"
              style={{ objectPosition: "center" }}
              sizes="100vw"
              priority
              placeholder="blur"
              blurDataURL={shimmerDataUrlWithTheme(400, 400, isDarkMode)}
            />
          </div>
        )}
        <div className="flex flex-row justify-between items-center gap-4">
          <div className="flex flex-row gap-3 items-center">
            {copany.logo_url && (
              <Image
                src={copany.logo_url || EMPTY_STRING}
                alt={copany.name || EMPTY_STRING}
                width={40}
                height={40}
                className="rounded-md"
                placeholder="blur"
                blurDataURL={shimmerDataUrlWithTheme(40, 40, isDarkMode)}
              />
            )}
            <h1 className="text-2xl font-bold">{copany.name}</h1>
          </div>
          <div className="hidden md:flex flex-row justify-between flex-wrap items-center gap-3 gap-y-4">
            <AssetLinksSection
              copany={copany}
              onConnectRepo={handleConnectRepo}
            />
            <StarButton
              copanyId={copany.id}
              size="md"
              count={copany.star_count}
            />
          </div>
          {shouldShowInlineOnMobile && (
            <div className="flex md:hidden flex-row justify-between flex-wrap items-center gap-3 gap-y-4">
              <AssetLinksSection
                copany={copany}
                onConnectRepo={handleConnectRepo}
              />
              <StarButton
                copanyId={copany.id}
                size="md"
                count={copany.star_count}
              />
            </div>
          )}
        </div>
        {!shouldShowInlineOnMobile && (
          <div className="flex md:hidden flex-row justify-between flex-wrap items-center gap-3 gap-y-4">
            <AssetLinksSection
              copany={copany}
              onConnectRepo={handleConnectRepo}
            />
            <StarButton
              copanyId={copany.id}
              size="md"
              count={copany.star_count}
            />
          </div>
        )}
      </div>

      {/* Connect Repo Modal */}
      <AssetLinkModal
        isOpen={isConnectRepoModalOpen}
        onClose={() => setIsConnectRepoModalOpen(false)}
        assetLinks={[
          {
            label: "Github",
            key: "github_url",
            value: copany.github_url,
            icon: GithubIcon,
            darkIcon: GithubDarkIcon,
            id: 1,
          },
        ]}
        copany={copany}
        onCopanyUpdate={handleCopanyUpdate}
        forceGithubType={true}
      />
    </>
  );
}
