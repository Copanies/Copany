"use client";

import { useMemo, useState, useCallback } from "react";
import { useDiscussions, useDeleteDiscussion } from "@/hooks/discussions";
import {
  useDiscussionVoteState,
  useToggleDiscussionVote,
} from "@/hooks/discussionVotes";
import type { Discussion } from "@/types/database.types";
import Button from "@/components/commons/Button";
import Modal from "@/components/commons/Modal";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import {
  ChatBubbleBottomCenterIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import arrowshape_up from "@/assets/arrowshape_up.svg";
import arrowshape_up_fill from "@/assets/arrowshape_up_fill.svg";
import { useUsersInfo } from "@/hooks/userInfo";
import type { UserInfo } from "@/actions/user.actions";
import Image from "next/image";
import { formatRelativeTime } from "@/utils/time";
import DiscussionCreateForm from "@/components/DiscussionCreateForm";
import DiscussionLabelChips from "@/components/DiscussionLabelChips";
import { useCurrentUser } from "@/hooks/currentUser";
import { useQueryClient } from "@tanstack/react-query";
import { useDiscussionLabels } from "@/hooks/discussionLabels";
import { useRouter } from "next/navigation";
import LoadingView from "@/components/commons/LoadingView";

import MilkdownEditor from "@/components/MilkdownEditor";

export default function DiscussionView({ copanyId }: { copanyId: string }) {
  const { data: discussions, isLoading } = useDiscussions(copanyId);
  const { data: labels = [] } = useDiscussionLabels(copanyId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string>("all");
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const allLabels = useMemo(() => {
    return labels.map((label) => label.name).sort();
  }, [labels]);

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

  // Handle discussion creation callback
  const handleDiscussionCreated = useCallback(
    (newDiscussion: Discussion) => {
      queryClient.setQueryData<Discussion[]>(
        ["discussions", copanyId],
        (prev) => {
          const base = prev || [];
          const exists = base.some(
            (it) => String(it.id) === String(newDiscussion.id)
          );
          return exists
            ? base.map((it) =>
                String(it.id) === String(newDiscussion.id) ? newDiscussion : it
              )
            : [...base, newDiscussion];
        }
      );
    },
    [copanyId, queryClient]
  );

  return (
    <div className="flex gap-5">
      <div className="w-44 shrink-0">
        <div className="sticky top-4 flex flex-col gap-3">
          <h3 className="text-base font-normal text-gray-900 dark:text-gray-100">
            Label
          </h3>
          <div className="flex flex-col gap-2">
            <button
              className={`text-sm rounded-lg px-2 py-1 text-left border hover:cursor-pointer ${
                activeLabel === "all"
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-black"
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
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-black"
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

      <section className="flex-1 flex flex-col gap-3 border-l border-gray-200 dark:border-gray-700 pl-5 mb-[200px] min-h-[calc(100vh-200px)] mx-auto">
        <div className="flex items-center">
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
        </div>

        {isLoading ? (
          <LoadingView type="label" />
        ) : !discussions || discussions.length === 0 ? (
          <EmptyPlaceholderView
            icon={
              <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-400" />
            }
            title="No discussions yet"
            description="Create the first discussion to kick off the conversation."
            buttonIcon={<PlusIcon className="w-4 h-4" />}
            buttonTitle="New discussion"
            buttonAction={() => setIsModalOpen(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyPlaceholderView
            icon={
              <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-400" />
            }
            title="No discussions for this label"
            description="Try another label or clear the filter."
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
                      ? (usersMap[String(d.creator_id)] as UserInfo | undefined)
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}

        {/* Create Discussion modal */}
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
      </section>
    </div>
  );
}

function DiscussionItem({
  copanyId,
  discussion,
  creator,
}: {
  copanyId: string;
  discussion: Discussion;
  creator?: UserInfo;
}) {
  const router = useRouter();
  const _remove = useDeleteDiscussion(copanyId);
  const { countQuery: voteCount, flagQuery: voteState } =
    useDiscussionVoteState(discussion.id, {
      enableCountQuery: discussion.vote_up_count == null,
      countInitialData: discussion.vote_up_count ?? undefined,
    });
  const voteToggle = useToggleDiscussionVote(discussion.id);

  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 dark:border-gray-700 pb-3">
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex-1 hover:cursor-pointer"
          onClick={() =>
            router.push(`/copany/${copanyId}/dicussion/${discussion.id}`)
          }
        >
          <div className="flex flex-col gap-3">
            {discussion.labels && discussion.labels.length > 0 && (
              <DiscussionLabelChips
                labelIds={discussion.labels}
                className="mt-1"
              />
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              {creator?.avatar_url ? (
                <Image
                  src={creator.avatar_url}
                  alt={creator.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-700 dark:text-gray-200">
                  {(creator?.name || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {creator?.name || "Unknown User"}
              </span>
              <span>·</span>
              <time title={discussion.created_at}>
                {formatRelativeTime(discussion.created_at)}
              </time>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-lg font-semibold">{discussion.title}</div>
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
        {/* <div className="flex flex-row gap-2">
          <Button
            size="sm"
            variant="danger"
            onClick={() => remove.mutate({ discussionId: discussion.id })}
            disabled={remove.isPending}
          >
            Delete
          </Button>
        </div> */}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => voteToggle.mutate({ toVote: !voteState.data })}
          disabled={voteToggle.isPending}
        >
          <div className="flex items-center gap-2">
            <Image
              src={voteState.data ? arrowshape_up_fill : arrowshape_up}
              alt="Vote"
              width={16}
              height={16}
            />
            <span>{voteCount.data ?? 0}</span>
          </div>
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            router.push(`/copany/${copanyId}/dicussion/${discussion.id}`)
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
