"use client";

import { StarIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import Button from "../commons/Button";
import { useStarState, useToggleStar } from "@/hooks/star";

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

  const formatAbbreviatedCount = (value: number): string => {
    if (value < 1000) return String(value);
    const units = ["k", "M", "B", "T"] as const;
    let v = value;
    let i = -1;
    while (v >= 1000 && i < units.length - 1) {
      v = v / 1000;
      i++;
    }
    const fixed = v.toFixed(1);
    const trimmed = fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
    return `${trimmed}${units[i]}`;
  };

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
        <span className={labelClass}>{formatAbbreviatedCount(count)}</span>
      </div>
    </Button>
  );
}
