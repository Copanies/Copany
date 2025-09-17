"use client";

import { StarIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import Button from "../commons/Button";
import { useStarState, useToggleStar } from "@/hooks/star";
import { formatAbbreviatedCount } from "@/utils/number";

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
  const { countQuery, flagQuery } = useStarState(copanyId, {
    enableCountQuery: upstreamCount == null,
    countInitialData: upstreamCount ?? undefined,
  });
  const toggle = useToggleStar(copanyId);
  const isStarred = !!flagQuery.data;
  const count = countQuery.data ?? 0;

  const abbreviatedCount = formatAbbreviatedCount(count);

  const handleClick = () => {
    toggle.mutate({ toStar: !isStarred });
  };

  const iconClass = `
    ${size === "sm" ? "w-4 h-4" : "w-4 h-4"}
    ${isStarred ? "text-[#FF9D0B]" : "text-gray-700 dark:text-gray-300"}
  `;
  const labelClass = size === "sm" ? "text-xs" : "text-sm";

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
