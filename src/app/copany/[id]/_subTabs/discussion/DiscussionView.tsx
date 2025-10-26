"use client";

import { Suspense } from "react";
import { useMemo, useState, useCallback } from "react";
import { useDiscussions, useDeleteDiscussion } from "@/hooks/discussions";
import { useDiscussionVoteCounts } from "@/hooks/discussionVotes";
import type { Discussion } from "@/types/database.types";
import Button from "@/components/commons/Button";
import Modal from "@/components/commons/Modal";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import {
  ChatBubbleBottomCenterIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { useUsersInfo } from "@/hooks/userInfo";
import type { UserInfo } from "@/actions/user.actions";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import { formatRelativeTime } from "@/utils/time";
import DiscussionCreateForm from "@/app/copany/[id]/_subTabs/discussion/DiscussionCreateForm";
import DiscussionLabelChips from "@/app/copany/[id]/_subTabs/discussion/DiscussionLabelChips";
import { useCurrentUser } from "@/hooks/currentUser";
import { useDiscussionLabels } from "@/hooks/discussionLabels";
import { useRouter } from "next/navigation";
import LoadingView from "@/components/commons/LoadingView";

import MilkdownEditor from "@/components/commons/MilkdownEditor";
import Dropdown from "@/components/commons/Dropdown";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import VoteButton from "@/components/discussion/VoteButton";

export default function DiscussionView({ copanyId }: { copanyId: string }) {
  const {
    data: discussionsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDiscussions(copanyId);
  const { data: labels = [] } = useDiscussionLabels(copanyId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string>("all");
  const { data: currentUser } = useCurrentUser();

  // Flatten all pages of discussions
  const discussions = useMemo(() => {
    return discussionsData?.pages.flatMap((page) => page.discussions) ?? [];
  }, [discussionsData]);

  const allLabels = useMemo(() => {
    return labels.map((label) => label.name).sort();
  }, [labels]);

  // Create dropdown options
  const dropdownOptions = useMemo(() => {
    const options = [{ value: -1, label: "All" as React.ReactNode }];

    labels.forEach((label, index) => {
      options.push({
        value: index,
        label: (
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: label.color }}
            />
            {label.name}
          </div>
        ) as React.ReactNode,
      });
    });

    return options;
  }, [labels]);

  // Get selected dropdown value
  const selectedDropdownValue = useMemo(() => {
    if (activeLabel === "all") return -1;
    const labelIndex = labels.findIndex((label) => label.name === activeLabel);
    return labelIndex >= 0 ? labelIndex : -1;
  }, [activeLabel, labels]);

  // Handle dropdown selection
  const handleDropdownSelect = useCallback(
    (value: number) => {
      if (value === -1) {
        setActiveLabel("all");
      } else {
        const selectedLabel = labels[value];
        if (selectedLabel) {
          setActiveLabel(selectedLabel.name);
        }
      }
    },
    [labels]
  );

  const filtered = useMemo(() => {
    if (!discussions) return [] as Discussion[];
    if (activeLabel === "all") return discussions;

    // Find the label ID for the active label name
    const activeLabelObj = labels.find((label) => label.name === activeLabel);
    if (!activeLabelObj) return discussions;

    return discussions.filter((d) =>
      (d.labels || []).includes(activeLabelObj.id)
    );
  }, [discussions, activeLabel, labels]);

  const creatorIds = useMemo(() => {
    const set = new Set<string>();
    (filtered || []).forEach((d) => {
      if (d.creator_id) set.add(String(d.creator_id));
    });
    return Array.from(set);
  }, [filtered]);
  const { data: usersMap = {} } = useUsersInfo(creatorIds);

  // Collect discussion IDs for batch vote queries
  const discussionIds = useMemo(() => {
    return (filtered || []).map((discussion) => String(discussion.id));
  }, [filtered]);

  // Batch fetch vote counts
  const { data: voteCounts = {} } = useDiscussionVoteCounts(discussionIds);

  // Handle discussion creation callback
  const handleDiscussionCreated = useCallback(() => {
    // The invalidation will trigger a refetch, so no manual cache update needed
  }, []);

  if (isLoading) {
    return <LoadingView type="label" />;
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
          description="Create the first discussion to kick off the conversation."
          buttonIcon={<PlusIcon className="w-4 h-4" />}
          buttonTitle="New discussion"
          buttonAction={() => setIsModalOpen(true)}
        />
        {createDiscussionModal()}
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-5 overflow-x-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-44 shrink-0">
        <div className="sticky top-4 flex flex-col gap-3">
          <h3 className="text-base font-normal text-gray-900 dark:text-gray-100">
            Label
          </h3>
          <div className="flex flex-col gap-2">
            <button
              className={`text-sm rounded-lg px-2 py-1 text-left border hover:cursor-pointer ${
                activeLabel === "all"
                  ? "bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-500"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => setActiveLabel("all")}
            >
              All
            </button>
            {allLabels.map((l) => (
              <button
                key={l}
                className={`text-sm rounded-lg px-2 py-1 text-left border hover:cursor-pointer ${
                  activeLabel === l
                    ? "bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-500"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                }`}
                onClick={() => setActiveLabel(l)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: labels.find((label) => label.name === l)
                        ?.color,
                    }}
                  />
                  {l}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="flex-1 flex flex-col gap-3 md:border-l border-gray-200 dark:border-gray-700 md:pl-5 pb-[200px] min-h-[calc(100vh-200px)]">
        <div className="flex flex-row gap-2 justify-between items-center">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="min-w-fit"
            size="md"
            disabled={!currentUser}
            disableTooltipConent="Sign in to create a discussion"
          >
            <div className="flex flex-row items-center gap-1">
              <span className="text-base">New Discussion</span>
            </div>
          </Button>
          <div className="md:hidden flex flex-col gap-3">
            <Dropdown
              trigger={
                <div className="flex w-fit items-center justify-between gap-2 text-sm rounded-lg px-3 py-2 border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 w-full max-w-[200px] h-[34px]">
                  <span className="shrink-0 truncate">
                    {activeLabel === "all" ? (
                      "All"
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: labels.find(
                              (label) => label.name === activeLabel
                            )?.color,
                          }}
                        />
                        <span className="shrink-0">{activeLabel}</span>
                      </div>
                    )}
                  </span>
                  <ChevronDownIcon className="w-4 h-4 shrink-0" />
                </div>
              }
              options={dropdownOptions}
              selectedValue={selectedDropdownValue}
              onSelect={handleDropdownSelect}
              showBackground={false}
              size="md"
            />
          </div>
        </div>

        <Suspense
          fallback={<LoadingView type="label" label="Loading discussions..." />}
        >
          {filtered.length === 0 ? (
            <EmptyPlaceholderView
              icon={
                <ChatBubbleLeftRightIcon
                  className="w-16 h-16 text-gray-500 dark:text-gray-400"
                  strokeWidth={1}
                />
              }
              title="No discussions for this label"
              description="Try another label."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {filtered.map((d) => (
                <li key={d.id} className="">
                  <DiscussionItem
                    copanyId={copanyId}
                    discussion={d}
                    creator={
                      d.creator_id
                        ? (usersMap[String(d.creator_id)] as
                            | UserInfo
                            | undefined)
                        : undefined
                    }
                    voteCounts={voteCounts}
                  />
                </li>
              ))}
            </ul>
          )}

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

        {/* Create Discussion modal */}
        {createDiscussionModal()}
      </section>
    </div>
  );

  function createDiscussionModal() {
    return (
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <DiscussionCreateForm
          copanyId={copanyId}
          onDiscussionCreated={handleDiscussionCreated}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>
    );
  }
}

function DiscussionItem({
  copanyId,
  discussion,
  creator,
  voteCounts,
}: {
  copanyId: string;
  discussion: Discussion;
  creator?: UserInfo;
  voteCounts: Record<string, number>;
}) {
  const isDarkMode = useDarkMode();
  const router = useRouter();
  const _remove = useDeleteDiscussion(copanyId);

  // Get vote count from batch query (used as initial data for VoteButton)
  const voteCount =
    voteCounts[String(discussion.id)] ?? discussion.vote_up_count ?? 0;

  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 dark:border-gray-700 pb-3 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex-1 hover:cursor-pointer min-w-0"
          onClick={() =>
            router.push(`/copany/${copanyId}/discussion/${discussion.id}`)
          }
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
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
            </div>
            <span className="block md:hidden">
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
        <VoteButton
          discussionId={String(discussion.id)}
          size="sm"
          count={voteCount}
        />

        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            router.push(`/copany/${copanyId}/discussion/${discussion.id}`)
          }
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
