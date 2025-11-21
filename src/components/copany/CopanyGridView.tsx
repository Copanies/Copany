"use client";
import { Suspense, useRef, useEffect, useMemo, useState } from "react";
import { Copany } from "@/types/database.types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDiscussions } from "@/hooks/discussions";
import { useDiscussionLabels } from "@/hooks/discussionLabels";
import MilkdownEditor from "@/components/commons/MilkdownEditor";
import LoadingView from "@/components/commons/LoadingView";
import { EMPTY_STRING } from "@/utils/constants";
import { PlusIcon, ScaleIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { generateRandomCatAvatarClient } from "@/utils/catAvatar";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import { useCurrentUser } from "@/hooks/currentUser";
import ExpandableText from "@/components/commons/ExpandableText";
import { useTransactions, useAppStoreFinance } from "@/hooks/finance";
import { convertTransactionsToChartData } from "@/utils/finance";
import type { ChartDataPoint } from "@/utils/finance";
import { formatAbbreviatedCount } from "@/utils/number";
import MiniFinanceChart from "@/components/finance/MiniFinanceChart";
import PlatformIcons from "@/components/copany/PlatformIcons";

interface CopanyGridViewProps {
  copanies: Copany[];
  showNewCopanyCard?: boolean;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

interface CopanyCardProps {
  copany: Copany;
  innerRef?: React.Ref<HTMLLIElement>;
}

/**
 * Individual copany card component that can use hooks
 */
function CopanyCard({ copany, innerRef }: CopanyCardProps) {
  const router = useRouter();
  const isDarkMode = useDarkMode();
  const { data: discussionsData } = useDiscussions(copany.id);
  const { data: labels } = useDiscussionLabels(copany.id);
  const { data: transactions = [] } = useTransactions(copany.id);
  const { data: appStoreFinanceData } = useAppStoreFinance(copany.id);

  // Flatten all pages of discussions
  const discussions =
    discussionsData?.pages.flatMap((page) => page.discussions) ?? [];

  // Find the "Begin idea" discussion
  const beginIdeaDiscussion = discussions.find((discussion) =>
    discussion.labels.includes(
      labels?.find((label) => label.name === "Begin idea")?.id || ""
    )
  );

  // Process finance data
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isConvertingData, setIsConvertingData] = useState(false);

  // Convert App Store finance data to transactions format
  const appStoreTransactions = useMemo(() => {
    if (
      !copany.id ||
      !appStoreFinanceData?.chartData ||
      appStoreFinanceData.chartData.length === 0
    ) {
      return [];
    }

    return appStoreFinanceData.chartData
      .map((item) => {
        const [yearStr, monthStr] = item.date.split("-");
        const year = Number(yearStr);
        const month = Number(monthStr);
        if (!Number.isFinite(year) || !Number.isFinite(month)) {
          return null;
        }
        const occurredAt = new Date(
          Date.UTC(year, month, 0, 0, 0, 0)
        ).toISOString();
        const normalizedAmount =
          typeof item.amountUSD === "number" && Number.isFinite(item.amountUSD)
            ? item.amountUSD
            : 0;

        return {
          id: `app-store-${copany.id}-${item.date}`,
          created_at: occurredAt,
          updated_at: occurredAt,
          copany_id: copany.id,
          actor_id: "__app_store__",
          type: "income" as const,
          description:
            "Automatically synced via App Store Connect API. The actual received amount may differ due to bank transfer fees and exchange rate differences.",
          amount: normalizedAmount,
          currency: "USD",
          status: "confirmed" as const,
          occurred_at: occurredAt,
          evidence_url: null,
        };
      })
      .filter((tx): tx is NonNullable<typeof tx> => tx !== null);
  }, [appStoreFinanceData?.chartData, copany.id]);

  // Combine regular transactions with App Store transactions
  const combinedTransactions = useMemo(() => {
    return [...(transactions ?? []), ...appStoreTransactions];
  }, [transactions, appStoreTransactions]);

  // Convert transactions to chart data format
  useEffect(() => {
    if (!combinedTransactions || combinedTransactions.length === 0) {
      setChartData([]);
      return;
    }

    setIsConvertingData(true);
    convertTransactionsToChartData(combinedTransactions)
      .then((data) => {
        setChartData(data);
        setIsConvertingData(false);
      })
      .catch((error) => {
        console.error("[CopanyCard] Failed to convert transactions:", error);
        setChartData([]);
        setIsConvertingData(false);
      });
  }, [combinedTransactions]);

  // Calculate AMR (Avg Monthly Revenue)
  const amr = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return 0;
    }
    return (
      chartData.reduce((sum, item) => sum + item.amountUSD, 0) /
      chartData.length
    );
  }, [chartData]);

  const amrLabel = (
    <div className="flex items-center gap-1">
      {chartData.length > 0 && amr !== 0 ? (
        <>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            <path
              d="M7.63398 2.5C8.01888 1.83333 8.98112 1.83333 9.36603 2.5L14.5622 11.5C14.9471 12.1667 14.466 13 13.6962 13H3.30385C2.53405 13 2.05292 12.1667 2.43782 11.5L7.63398 2.5Z"
              fill="#27AE60"
            />
          </svg>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
            AMR {amr < 0 ? "-" : ""}$
            {Math.abs(amr).toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
        </>
      ) : (
        <>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            <path
              d="M7.63398 2.5C8.01888 1.83333 8.98112 1.83333 9.36603 2.5L14.5622 11.5C14.9471 12.1667 14.466 13 13.6962 13H3.30385C2.53405 13 2.05292 12.1667 2.43782 11.5L7.63398 2.5Z"
              fill="#9CA3AF"
              className="dark:fill-gray-500"
            />
          </svg>
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
            No Revenue
          </span>
        </>
      )}
    </div>
  );

  return (
    <li
      ref={innerRef}
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
                  <div className="absolute top-3 left-3 z-5">
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
                <div className="relative z-5 flex items-center justify-center w-full h-auto max-h-32">
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
                  <div className="relative z-5 flex items-start justify-center w-full h-full overflow-hidden">
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
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#FBF9F5] dark:from-[#222221] to-transparent pointer-events-none z-5"></div>
                    <div className="absolute -top-1 left-0 right-0 h-8 bg-gradient-to-b from-[#FBF9F5] dark:from-[#222221] to-transparent pointer-events-none z-5"></div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-row justify-between min-w-0 gap-2">
              <div className="flex flex-row min-w-0 gap-2 items-center">
                <div className="font-semibold text-lg truncate max-w-full text-ellipsis overflow-hidden">
                  {copany.name}
                </div>
                <PlatformIcons platforms={copany.platforms} size="sm" />
                {/* <AssetLinksSection copany={copany} size="sm" /> */}
              </div>
              {amrLabel}
            </div>
            <div className="flex flex-row min-w-0 gap-2">
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <ExpandableText
                  contentClassName="text-sm"
                  text={copany.description || "No description"}
                  maxLines={5}
                />
                {/* About info row */}
                <div className="flex flex-row items-center gap-x-2 gap-y-1 flex-wrap">
                  {/* COSL protocol status */}
                  <div className="flex flex-row items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill={copany.isDefaultUseCOSL ? "#27AE60" : "#E74C3C"}
                      className="w-3 h-3 shrink-0"
                    >
                      <circle cx="8" cy="8" r="8" />
                    </svg>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {copany.isDefaultUseCOSL
                        ? "Contribution-based revenue"
                        : "Revenue not guaranteed"}
                    </span>
                  </div>
                  {/* Star count */}
                  <div className="flex flex-row items-center gap-1.5">
                    <StarSolidIcon className="w-4 h-4 text-[#FF9D0B] shrink-0" />
                    <span className="text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatAbbreviatedCount(copany.star_count ?? 0)}
                    </span>
                  </div>
                  {/* License */}
                  {copany.license && (
                    <div className="flex flex-row items-center gap-1.5">
                      <ScaleIcon
                        className="w-4 h-4 text-gray-900 dark:text-gray-100 shrink-0"
                        strokeWidth={1.5}
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {copany.license}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {!isConvertingData && (
                <div className="flex flex-col items-end gap-1 shrink-0 ml-auto">
                  {/* Mini chart */}
                  <MiniFinanceChart
                    chartData={chartData.length > 0 ? chartData : []}
                    isDarkMode={isDarkMode}
                    hasNoData={chartData.length === 0}
                  />
                </div>
              )}
            </div>
            {/* Finance info in top-right */}

            {/* <div className="flex items-center gap-2 shrink-0">
              <ContributorAvatarStack copany={copany} size="lg" />
              <StarButton
                copanyId={String(copany.id)}
                size="sm"
                count={copany.star_count}
              />
            </div> */}
          </div>
        </div>
      </div>
    </li>
  );
}

interface NewCopanyCardProps {
  innerRef?: React.Ref<HTMLLIElement>;
}

function NewCopanyCard({ innerRef }: NewCopanyCardProps) {
  const router = useRouter();
  const { data: user } = useCurrentUser();
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
      ref={innerRef}
      className="cursor-pointer sm:mx-0"
      onClick={() => {
        if (user) {
          router.push(`/new`);
        } else {
          router.push(`/signup`);
        }
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

            <div className="relative z-5 flex flex-row items-center justify-center gap-2">
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
  fetchNextPage,
  hasNextPage = false,
  isFetchingNextPage = false,
}: CopanyGridViewProps) {
  const lastElementRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!lastElementRef.current || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage?.();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "200px",
      }
    );

    observer.observe(lastElementRef.current);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-10 max-w-[1240px] justify-center mx-auto w-full">
        {copanies.map((copany, index) => (
          <CopanyCard
            key={copany.id}
            copany={copany}
            innerRef={
              index === copanies.length - 1 ? lastElementRef : undefined
            }
          />
        ))}
        {showNewCopanyCard && (
          <NewCopanyCard
            innerRef={
              copanies.length === 0 || !hasNextPage ? lastElementRef : undefined
            }
          />
        )}
      </ul>

      {/* Loading indicator */}
      {isFetchingNextPage && (
        <div className="flex justify-center mt-8 pb-10">
          <LoadingView type="label" label="Loading more copanies..." />
        </div>
      )}
    </>
  );
}
