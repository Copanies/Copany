"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChatBubbleBottomCenterIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import arrowshape_up from "@/assets/arrowshape_up.svg";
import arrowshape_up_fill from "@/assets/arrowshape_up_fill.svg";
import { useDiscussion } from "@/hooks/discussions";
import {
  useDiscussionVoteState,
  useToggleDiscussionVote,
} from "@/hooks/discussionVotes";
import { useUsersInfo } from "@/hooks/userInfo";
import { useCurrentUser } from "@/hooks/currentUser";
import Button from "@/components/commons/Button";
import DiscussionLabelChips from "@/components/DiscussionLabelChips";
import DiscussionCommentTimeline from "./DiscussionCommentTimeline";
import { formatRelativeTime } from "@/utils/time";
import LoadingView from "@/components/commons/LoadingView";
import MilkdownEditor from "@/components/MilkdownEditor";

interface DiscussionPageClientProps {
  copanyId: string;
  discussionId: string;
}

export default function DiscussionPageClient({
  copanyId: _copanyId,
  discussionId,
}: DiscussionPageClientProps) {
  const router = useRouter();
  const { data: discussion, isLoading } = useDiscussion(discussionId);
  const { data: currentUser } = useCurrentUser();
  const { countQuery, flagQuery } = useDiscussionVoteState(discussionId, {
    countInitialData: discussion?.vote_up_count,
  });
  const voteToggle = useToggleDiscussionVote(discussionId);

  // 获取作者信息
  const creatorIds = useMemo(() => {
    if (!discussion?.creator_id) return [];
    return [String(discussion.creator_id)];
  }, [discussion?.creator_id]);
  const { data: usersMap = {} } = useUsersInfo(creatorIds);

  const creator = discussion?.creator_id
    ? usersMap[String(discussion.creator_id)]
    : undefined;

  if (isLoading) {
    return <LoadingView />;
  }

  if (!discussion) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">Discussion not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header with back button */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          shape="square"
          onClick={() => router.back()}
        >
          <ChevronLeftIcon className="w-3 h-3 text-gray-900 dark:text-gray-100" />
        </Button>
      </div>

      {/* Discussion header */}
      <div className="bg-white dark:bg-gray-900 mb-5">
        {/* Labels */}
        {discussion.labels && discussion.labels.length > 0 && (
          <div className="mb-4">
            <DiscussionLabelChips labelIds={discussion.labels} />
          </div>
        )}

        {/* Creator info */}
        <div className="flex items-center gap-3 mb-2">
          {creator?.avatar_url ? (
            <Image
              src={creator.avatar_url}
              alt={creator.name}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm text-gray-700 dark:text-gray-200">
              {(creator?.name || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {creator?.name || "Unknown User"}
            </span>
            <span className="text-sm text-gray-500">
              {formatRelativeTime(discussion.created_at)}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {discussion.title}
          </h1>

          {/* Description */}
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

        {/* Vote button */}
        <div className="flex items-center gap-3 mt-3">
          <Button
            size="sm"
            variant={"secondary"}
            onClick={() => voteToggle.mutate({ toVote: !flagQuery.data })}
            disabled={voteToggle.isPending || !currentUser}
            disableTooltipConent={!currentUser ? "Sign in to vote" : undefined}
          >
            <div className="flex items-center gap-2">
              <Image
                src={flagQuery.data ? arrowshape_up_fill : arrowshape_up}
                alt="Vote"
                width={16}
                height={16}
              />
              <span>{countQuery.data ?? 0}</span>
            </div>
          </Button>
          <Button size="sm" variant="secondary" onClick={() => {}}>
            <div className="flex items-center gap-2">
              <ChatBubbleBottomCenterIcon
                className="w-4 h-4"
                strokeWidth={1.5}
              />
              <span>{discussion.comment_count ?? 0}</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Comments Timeline */}
      <DiscussionCommentTimeline
        discussionId={discussionId}
        canEdit={!!currentUser}
      />
    </div>
  );
}
