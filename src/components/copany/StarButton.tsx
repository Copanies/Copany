"use client";

import { StarIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import Button from "../commons/Button";
import { useStarState, useToggleStar } from "@/hooks/star";
import { formatAbbreviatedCount } from "@/utils/number";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/currentUser";

type Size = "sm" | "md";

export default function StarButton({
  copanyId,
  size = "md",
  count: upstreamCount,
}: {
  copanyId: string;
  size?: Size;
  count?: number;
}) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const { countQuery, flagQuery } = useStarState(copanyId, {
    enableCountQuery: upstreamCount == null,
    countInitialData: upstreamCount ?? undefined,
  });
  const toggle = useToggleStar(copanyId);
  const isStarred = !!flagQuery.data;
  const count = countQuery.data ?? 0;

  const abbreviatedCount = formatAbbreviatedCount(count);

  const handleClick = () => {
    // Check if user is logged in
    if (!currentUser) {
      console.log("[StarButton] User not logged in, redirecting to login");
      router.push("/login");
      return;
    }

    console.log("[StarButton] Toggling star:", {
      copanyId,
      currentState: isStarred,
      newState: !isStarred,
    });

    toggle.mutate(
      { toStar: !isStarred },
      {
        onSuccess: () => {
          console.log("[StarButton] Star toggle successful");
        },
        onError: (error) => {
          console.error("[StarButton] Star toggle failed:", error);
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
