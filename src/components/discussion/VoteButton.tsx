"use client";

import Image from "next/image";
import Button from "../commons/Button";
import {
  useDiscussionVoteState,
  useToggleDiscussionVote,
} from "@/hooks/discussionVotes";
import arrowshape_up from "@/assets/arrowshape_up.svg";
import arrowshape_up_fill from "@/assets/arrowshape_up_fill.svg";
import arrowshape_up_fill_dark from "@/assets/arrowshape_up_fill_dark.svg";
import arrowshape_up_dark from "@/assets/arrowshape_up_dark.svg";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/currentUser";

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
          className="transition-opacity duration-200"
        />
        <span className="transition-all duration-200">{voteCount}</span>
      </div>
    </Button>
  );
}
