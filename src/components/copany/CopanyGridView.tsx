"use client";
import { Suspense } from "react";
import { Copany } from "@/types/database.types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AssetLinksSection from "@/components/copany/AssetLinksSection";
import ContributorAvatarStack from "@/components/copany/ContributorAvatarStack";
import LicenseBadge from "@/components/copany/LicenseBadge";
import StarButton from "@/components/copany/StarButton";
import { useDiscussions } from "@/hooks/discussions";
import { useDiscussionLabels } from "@/hooks/discussionLabels";
import MilkdownEditor from "@/components/commons/MilkdownEditor";
import LoadingView from "@/components/commons/LoadingView";
import { EMPTY_STRING } from "@/utils/constants";
import { PlusIcon } from "@heroicons/react/24/outline";
import { generateRandomCatAvatarClient } from "@/utils/catAvatar";
import { useState, useEffect } from "react";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";

interface CopanyGridViewProps {
  copanies: Copany[];
  showNewCopanyCard?: boolean;
}

interface CopanyCardProps {
  copany: Copany;
}

/**
 * Individual copany card component that can use hooks
 */
function CopanyCard({ copany }: CopanyCardProps) {
  const router = useRouter();
  const isDarkMode = useDarkMode();
  const { data: discussions } = useDiscussions(copany.id);
  const { data: labels } = useDiscussionLabels(copany.id);

  // Find the "Begin idea" discussion
  const beginIdeaDiscussion = discussions?.find((discussion) =>
    discussion.labels.includes(
      labels?.find((label) => label.name === "Begin idea")?.id || ""
    )
  );

  return (
    <li
      key={copany.id}
      className="cursor-pointer sm:mx-0"
      onClick={() => {
        router.push(`/copany/${copany.id}`);
      }}
    >
      <div className="flex flex-col gap-4 h-full">
        <div className="flex flex-col gap-2">
          {/* Different layouts based on whether cover image exists */}
          <div className="relative flex flex-col items-center justify-center gap-2 px-5 py-3 rounded-[20px] overflow-hidden aspect-[1.8]">
            {copany.cover_image_url && copany.logo_url ? (
              <>
                {/* Cover image layout: fill the space, no blur, logo in top-left */}
                <Image
                  src={copany.cover_image_url}
                  alt="Organization Cover"
                  fill
                  className="object-cover w-full h-full"
                  style={{ objectPosition: "center" }}
                  sizes="100vw"
                  placeholder="blur"
                  blurDataURL={shimmerDataUrlWithTheme(400, 400, isDarkMode)}
                  priority
                />
                {/* Foreground logo in top-left corner */}
                {copany.logo_url && (
                  <div className="absolute top-3 left-3 z-10">
                    <Image
                      src={copany.logo_url}
                      alt="Organization Avatar"
                      className="rounded-lg object-contain"
                      width={64}
                      height={64}
                      placeholder="blur"
                      blurDataURL={shimmerDataUrlWithTheme(64, 64, isDarkMode)}
                      priority
                    />
                  </div>
                )}
              </>
            ) : copany.logo_url ? (
              <>
                {/* Logo-only layout: 200% width, blur background */}
                <div
                  className="absolute left-1/2 top-0 z-0 pointer-events-none select-none"
                  style={{
                    width: "200%",
                    height: "200%",
                    transform: "translateX(-50%) translateY(-25%)",
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src={copany.logo_url}
                    alt="Organization Background"
                    fill
                    className="object-contain w-full h-full blur-[30px]"
                    style={{ objectPosition: "center", opacity: 0.7 }}
                    sizes="200vw"
                    placeholder="blur"
                    blurDataURL={shimmerDataUrlWithTheme(400, 400, isDarkMode)}
                    priority
                  />
                </div>
                {/* White gradient overlay to highlight logo */}
                <div
                  className="absolute inset-0 z-5 blur-[30px]"
                  style={{
                    background:
                      "radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
                  }}
                ></div>
                {/* Foreground logo, centered */}
                <div className="relative z-10 flex items-center justify-center w-full h-auto max-h-32">
                  <Image
                    src={copany.logo_url}
                    alt="Organization Avatar"
                    className="rounded-xl object-contain"
                    width={128}
                    height={128}
                    placeholder="blur"
                    blurDataURL={shimmerDataUrlWithTheme(128, 128, isDarkMode)}
                    priority
                  />
                </div>
              </>
            ) : (
              <>
                {/* No logo layout: show Begin idea discussion description with #FBF9F5 background */}
                <div
                  className={`absolute inset-0 bg-[#FBF9F5] dark:bg-[#222221] ${
                    beginIdeaDiscussion?.description ? "" : "animate-pulse"
                  } `}
                ></div>
                {beginIdeaDiscussion?.description && (
                  <div className="relative z-10 flex items-start justify-center w-full h-full overflow-hidden">
                    <div className="w-full h-full overflow-y-auto scrollbar-hide relative">
                      <Suspense
                        fallback={
                          <LoadingView
                            type="label"
                            label="Loading content..."
                          />
                        }
                      >
                        <MilkdownEditor
                          initialContent={
                            beginIdeaDiscussion?.description || "Loading..."
                          }
                          isReadonly={true}
                          maxSizeTitle="sm"
                          placeholder={EMPTY_STRING}
                          className="w-full"
                        />
                      </Suspense>
                    </div>
                    {/* Gradient shadow overlay at the bottom - fixed position */}
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#FBF9F5] dark:from-[#222221] to-transparent pointer-events-none z-20"></div>
                    <div className="absolute -top-1 left-0 right-0 h-8 bg-gradient-to-b from-[#FBF9F5] dark:from-[#222221] to-transparent pointer-events-none z-20"></div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex flex-row items-center gap-2">
            <div className="font-semibold text-lg">{copany.name}</div>
            <AssetLinksSection copany={copany} size="sm" />
            <div className="ml-auto flex items-center gap-2">
              <ContributorAvatarStack copany={copany} size="lg" />
              <StarButton
                copanyId={String(copany.id)}
                size="sm"
                count={copany.star_count}
              />
            </div>
          </div>
          <div className="">{copany.description || "No description"}</div>
          <div className="">
            <LicenseBadge
              license={copany.license}
              isDefaultUseCOSL={copany.isDefaultUseCOSL}
              size="sm"
              copanyId={copany.id}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

function NewCopanyCard() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [catAvatars, setCatAvatars] = useState<string[]>([]);

  useEffect(() => {
    // Generate 24 random cat avatars for hover effect (same as CatBanner)
    const avatars = Array.from({ length: 4 }, () =>
      generateRandomCatAvatarClient(false, true)
    );
    setCatAvatars(avatars);
  }, []);

  return (
    <li
      className="cursor-pointer sm:mx-0"
      onClick={() => {
        router.push(`/new`);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col gap-4 h-full">
        <div className="flex flex-col gap-2">
          {/* Different layouts based on whether cover image exists */}
          <div className="relative flex flex-row items-center justify-center gap-2 px-5 py-3 rounded-[20px] overflow-hidden aspect-[1.8] bg-[#FBF9F5] dark:bg-[#222221] transition-all duration-500">
            {/* Hover cats effect - using absolute positioning with smooth animations */}
            {/* Bottom cats */}
            <div
              className={`absolute -bottom-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-between items-end transition-transform duration-700 ease-out ${
                isHovered ? "translate-y-0" : "translate-y-20"
              }`}
            >
              <div
                key={`cat-0`}
                className={`transition-transform duration-700 ease-out ${
                  isHovered ? "delay-100" : "delay-0"
                }`}
                style={{ transform: "scaleX(-1)" }}
                dangerouslySetInnerHTML={{ __html: catAvatars[0] }}
              />
              <div
                key={`cat-1`}
                className={`transition-transform duration-700 ease-out ${
                  isHovered ? "delay-200" : "delay-0"
                }`}
                dangerouslySetInnerHTML={{ __html: catAvatars[1] }}
              />
            </div>

            {/* Left cats */}
            <div
              className={`absolute -left-5 top-1/2 transform -translate-y-1 transition-transform duration-700 ease-out ${
                isHovered
                  ? "translate-x-0 delay-150"
                  : "-translate-x-20 delay-0"
              }`}
            >
              <div
                key={`cat-3`}
                className="transition-transform duration-700 ease-out"
                style={{ transform: "scaleX(-1)" }}
                dangerouslySetInnerHTML={{ __html: catAvatars[2] }}
              />
            </div>

            {/* Right cats */}
            <div
              className={`absolute -right-5 top-1/2 transform -translate-y-1 transition-transform duration-700 ease-out ${
                isHovered ? "translate-x-0 delay-150" : "translate-x-20 delay-0"
              }`}
            >
              <div
                key={`cat-4`}
                className="transition-transform duration-700 ease-out"
                dangerouslySetInnerHTML={{ __html: catAvatars[3] }}
              />
            </div>

            <div className="relative z-10 flex flex-row items-center justify-center gap-2">
              <PlusIcon className="w-7 h-7 text-gray-900 dark:text-gray-100" />
              <div className="font-medium text-xl text-gray-900 dark:text-gray-100">
                Start new copany
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Copany grid view component - Pure rendering component
 */
export default function CopanyGridView({
  copanies,
  showNewCopanyCard = true,
}: CopanyGridViewProps) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-10 max-w-[820px] justify-center mx-auto w-full">
      {copanies.map((copany) => (
        <CopanyCard key={copany.id} copany={copany} />
      ))}
      {showNewCopanyCard && <NewCopanyCard />}
    </ul>
  );
}
