"use client";

import Button from "../commons/Button";
import {
  useDiscussionVoteState,
  useToggleDiscussionVote,
} from "@/hooks/discussionVotes";
import { useDarkMode } from "@/utils/useDarkMode";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/currentUser";
import ArrowshapeUpIcon from "@/components/icon/ArrowshapeUpIcon";
import ArrowshapeUpDarkIcon from "@/components/icon/ArrowshapeUpDarkIcon";
import ArrowshapeUpFillIcon from "@/components/icon/ArrowshapeUpFillIcon";
import ArrowshapeUpFillDarkIcon from "@/components/icon/ArrowshapeUpFillDarkIcon";

type Size = "sm" | "md";

interface VoteButtonProps {
  discussionId: string;
  size?: Size;
  count?: number;
}

export default function VoteButton({
  discussionId,
  size = "sm",
  count: upstreamCount,
}: VoteButtonProps) {
  const router = useRouter();
  const isDarkMode = useDarkMode();
  const { data: currentUser } = useCurrentUser();

  const { countQuery, flagQuery } = useDiscussionVoteState(discussionId, {
    enableCountQuery: upstreamCount == null,
    countInitialData: upstreamCount ?? undefined,
  });

  const voteToggle = useToggleDiscussionVote(discussionId);
  const hasVoted = !!flagQuery.data;
  const voteCount = countQuery.data ?? 0;

  const handleClick = () => {
    // Check if user is logged in
    if (!currentUser) {
      console.log("[VoteButton] User not logged in, redirecting to login");
      router.push("/login");
      return;
    }

    console.log("[VoteButton] Toggling vote:", {
      discussionId,
      currentState: hasVoted,
      newState: !hasVoted,
    });

    voteToggle.mutate(
      { toVote: !hasVoted },
      {
        onSuccess: () => {
          console.log("[VoteButton] Vote toggle successful");
        },
        onError: (error) => {
          console.error("[VoteButton] Vote toggle failed:", error);
        },
      }
    );
  };

  return (
    <Button
      size={size}
      variant="secondary"
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
      disableTooltipConent={!currentUser ? "Sign in to vote" : undefined}
    >
      <div className="flex items-center gap-2 transition-all duration-200">
        {hasVoted ? (
          isDarkMode ? (
            <ArrowshapeUpFillDarkIcon className="w-4 h-4 transition-opacity duration-200" />
          ) : (
            <ArrowshapeUpFillIcon className="w-4 h-4 transition-opacity duration-200" />
          )
        ) : isDarkMode ? (
          <ArrowshapeUpDarkIcon className="w-4 h-4 transition-opacity duration-200" />
        ) : (
          <ArrowshapeUpIcon className="w-4 h-4 transition-opacity duration-200" />
        )}
        <span className="transition-all duration-200">{voteCount}</span>
      </div>
    </Button>
  );
}
