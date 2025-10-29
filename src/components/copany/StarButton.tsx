"use client";

import { StarIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import Button from "../commons/Button";
import { useHasStarred, useToggleStar } from "@/hooks/star";
import { formatAbbreviatedCount } from "@/utils/number";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/currentUser";
import { useState, useEffect } from "react";

type Size = "sm" | "md";

export default function StarButton({
  copanyId,
  size = "md",
  count: upstreamCount = 0,
}: {
  copanyId: string;
  size?: Size;
  count?: number;
}) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();

  // Only query if user has starred (this is the only information we need from server)
  const { data: isStarredFromQuery = false } = useHasStarred(copanyId);

  // Manage count and isStarred locally with optimistic updates
  const [count, setCount] = useState(upstreamCount);
  const [isStarred, setIsStarred] = useState(isStarredFromQuery);

  // Sync with upstream count when it changes (e.g., from parent re-render with fresh data)
  useEffect(() => {
    setCount(upstreamCount);
  }, [upstreamCount]);

  // Sync with query result
  useEffect(() => {
    setIsStarred(isStarredFromQuery);
  }, [isStarredFromQuery]);

  const toggle = useToggleStar(copanyId);

  const abbreviatedCount = formatAbbreviatedCount(count);

  const handleClick = () => {
    // Check if user is logged in
    if (!currentUser) {
      console.log("[StarButton] User not logged in, redirecting to login");
      router.push("/login");
      return;
    }

    // Save current values for potential rollback
    const prevIsStarred = isStarred;
    const prevCount = count;

    // Optimistically update local state immediately
    const willBeStarred = !isStarred;
    setIsStarred(willBeStarred);
    setCount((prev) => Math.max(0, willBeStarred ? prev + 1 : prev - 1));

    console.log("[StarButton] Toggling star:", {
      copanyId,
      currentState: isStarred,
      newState: willBeStarred,
    });

    toggle.mutate(
      { toStar: willBeStarred },
      {
        onSuccess: () => {
          console.log("[StarButton] Star toggle successful");
        },
        onError: (error) => {
          console.error("[StarButton] Star toggle failed:", error);
          // Rollback on error - revert to previous state
          setIsStarred(prevIsStarred);
          setCount(prevCount);
        },
      }
    );
  };

  const iconClass = `
    ${size === "sm" ? "w-4 h-4" : "w-4 h-4"}
    ${isStarred ? "text-[#FF9D0B]" : "text-gray-700 dark:text-gray-300"}
    transition-colors duration-200
  `;
  const labelClass = `${
    size === "sm" ? "text-sm" : "text-base"
  } transition-all duration-200`;

  return (
    <Button
      variant={"secondary"}
      size={size}
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
    >
      <div className="flex items-center gap-1">
        {isStarred ? (
          <StarSolidIcon className={iconClass} />
        ) : (
          <StarIcon className={iconClass} />
        )}
        <span className={labelClass}>{abbreviatedCount}</span>
      </div>
    </Button>
  );
}
