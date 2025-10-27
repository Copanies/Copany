"use client";

import { Suspense, useState } from "react";
import { useMemo } from "react";
import { useAllDiscussions } from "@/hooks/discussions";
import {
  useToggleDiscussionVote,
  useDiscussionVoteCounts,
  useMyVotedDiscussionIds,
} from "@/hooks/discussionVotes";
import type { Discussion } from "@/types/database.types";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import arrowshape_up from "@/assets/arrowshape_up.svg";
import arrowshape_up_fill from "@/assets/arrowshape_up_fill.svg";
import arrowshape_up_fill_dark from "@/assets/arrowshape_up_fill_dark.svg";
import arrowshape_up_dark from "@/assets/arrowshape_up_dark.svg";
import { useUsersInfo } from "@/hooks/userInfo";
import type { UserInfo } from "@/actions/user.actions";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import { formatRelativeTime } from "@/utils/time";
import DiscussionLabelChips from "@/components/discussion/DiscussionLabelChips";
import { useRouter } from "next/navigation";
import LoadingView from "@/components/commons/LoadingView";
import MilkdownEditor from "@/components/commons/MilkdownEditor";
import Button from "@/components/commons/Button";
import { useCopaniesByIds } from "@/hooks/copany";
import type { Copany } from "@/types/database.types";
import { ChatBubbleBottomCenterIcon } from "@heroicons/react/24/outline";
import { useCurrentUser } from "@/hooks/currentUser";
import Modal from "@/components/commons/Modal";
import DiscussionCreateForm from "@/components/discussion/DiscussionCreateForm";

export default function DiscussionView() {
  const {
    data: discussionsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAllDiscussions();
  const { data: currentUser } = useCurrentUser();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Flatten all pages of discussions
  const discussions = useMemo(() => {
    return discussionsData?.pages.flatMap((page) => page.discussions) ?? [];
  }, [discussionsData]);

  // Extract unique copany IDs from discussions
  const copanyIds = useMemo(() => {
    const set = new Set<string>();
    (discussions || []).forEach((d) => {
      if (d.copany_id) set.add(String(d.copany_id));
    });
    return Array.from(set);
  }, [discussions]);

  const { data: copaniesMap = {} } = useCopaniesByIds(copanyIds);

  const creatorIds = useMemo(() => {
    const set = new Set<string>();
    (discussions || []).forEach((d) => {
      if (d.creator_id) set.add(String(d.creator_id));
    });
    return Array.from(set);
  }, [discussions]);
  const { data: usersMap = {} } = useUsersInfo(creatorIds);

  // Collect discussion IDs for batch vote queries
  const discussionIds = useMemo(() => {
    return (discussions || []).map((discussion) => String(discussion.id));
  }, [discussions]);

  // Batch fetch vote counts and voted status
  const { data: voteCounts = {} } = useDiscussionVoteCounts(discussionIds);
  const { data: votedDiscussionIds = [] } = useMyVotedDiscussionIds();

  if (isLoading) {
    return <LoadingView type="page" />;
  }
  if (!discussions || discussions.length === 0) {
    return (
      <div>
        <EmptyPlaceholderView
          icon={
            <ChatBubbleLeftRightIcon
              className="w-16 h-16 text-gray-500 dark:text-gray-400"
              strokeWidth={1}
            />
          }
          title="No discussions yet"
          description="There are no discussions across all copanies yet."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-[200px] min-h-[calc(100vh-200px)]">
      <section className="flex-1 flex flex-col gap-3">
        <Suspense fallback={<LoadingView type="page" />}>
          <div className="flex mb-3">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="min-w-fit w-fit"
              size="md"
              disabled={!currentUser}
              disableTooltipConent="Sign in to create a discussion"
            >
              <div className="flex flex-row items-center gap-1">
                <span className="text-base">New Discussion</span>
              </div>
            </Button>
          </div>

          <ul className="flex flex-col gap-3">
            {discussions.map((d) => (
              <li key={d.id} className="">
                <DiscussionItem
                  discussion={d}
                  copany={copaniesMap[String(d.copany_id)]}
                  creator={
                    d.creator_id
                      ? (usersMap[String(d.creator_id)] as UserInfo | undefined)
                      : undefined
                  }
                  voteCounts={voteCounts}
                  votedDiscussionIds={votedDiscussionIds}
                />
              </li>
            ))}
          </ul>

          {/* Load More Button */}
          {hasNextPage && (
            <div className="flex justify-center mt-4">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                size="md"
              >
                {isFetchingNextPage ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </Suspense>
      </section>

      {/* Create Discussion Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <DiscussionCreateForm
          onDiscussionCreated={() => {
            setIsModalOpen(false);
            // Refresh discussions list
            window.location.reload();
          }}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

function DiscussionItem({
  discussion,
  copany,
  creator,
  voteCounts,
  votedDiscussionIds,
}: {
  discussion: Discussion;
  copany?: Copany;
  creator?: UserInfo;
  voteCounts: Record<string, number>;
  votedDiscussionIds: string[];
}) {
  const isDarkMode = useDarkMode();
  const router = useRouter();

  // Use batch fetched data instead of individual queries
  const hasVoted = votedDiscussionIds.includes(String(discussion.id));
  const voteCount =
    voteCounts[String(discussion.id)] ?? discussion.vote_up_count ?? 0;
  const voteToggle = useToggleDiscussionVote(discussion.id);

  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 dark:border-gray-700 pb-3 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex-1 hover:cursor-pointer min-w-0"
          onClick={() => {
            if (discussion.copany_id) {
              router.push(
                `/copany/${discussion.copany_id}/discussion/${discussion.id}`
              );
            } else {
              router.push(`/discussion/${discussion.id}`);
            }
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-row items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              {creator?.avatar_url ? (
                <Image
                  src={creator.avatar_url}
                  alt={creator.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full"
                  placeholder="blur"
                  blurDataURL={shimmerDataUrlWithTheme(32, 32, isDarkMode)}
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-700 dark:text-gray-200">
                  {(creator?.name || "").slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {creator?.name || ""}
              </span>
              <span className="hidden md:block">
                {discussion.labels && discussion.labels.length > 0 && (
                  <DiscussionLabelChips labelIds={discussion.labels} />
                )}
              </span>
              <span>·</span>
              <time title={discussion.created_at}>
                {formatRelativeTime(discussion.created_at)}
              </time>

              {discussion.copany_id && (
                <div className="flex flex-row items-center gap-2 ml-auto">
                  {copany?.logo_url && (
                    <Image
                      src={copany?.logo_url}
                      alt={copany?.name}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-md hover:cursor-pointer hover:opacity-80 transition-all duration-200"
                      placeholder="blur"
                      blurDataURL={shimmerDataUrlWithTheme(24, 24, isDarkMode)}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/copany/${discussion.copany_id}`);
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            <span className="block md:hidden flex flex-row items-center gap-2 text-gray-600 dark:text-gray-400">
              {discussion.labels && discussion.labels.length > 0 && (
                <DiscussionLabelChips labelIds={discussion.labels} />
              )}
            </span>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="text-lg font-semibold break-words">
                {discussion.title}
              </div>
              {discussion.description && (
                <div className="text-gray-700 dark:text-gray-300 -mx-3 -my-2">
                  <MilkdownEditor
                    initialContent={discussion.description}
                    maxSizeTitle="sm"
                    isReadonly={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => voteToggle.mutate({ toVote: !hasVoted })}
          disabled={voteToggle.isPending}
        >
          <div className="flex items-center gap-2">
            <Image
              src={
                hasVoted
                  ? isDarkMode
                    ? arrowshape_up_fill_dark
                    : arrowshape_up_fill
                  : isDarkMode
                  ? arrowshape_up_dark
                  : arrowshape_up
              }
              alt="Vote"
              width={16}
              height={16}
              placeholder="blur"
              blurDataURL={shimmerDataUrlWithTheme(16, 16, isDarkMode)}
            />
            <span>{voteCount}</span>
          </div>
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (discussion.copany_id) {
              router.push(
                `/copany/${discussion.copany_id}/discussion/${discussion.id}`
              );
            } else {
              router.push(`/discussion/${discussion.id}`);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <ChatBubbleBottomCenterIcon className="w-4 h-4" strokeWidth={1.5} />
            <span>{discussion.comment_count ?? 0}</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
