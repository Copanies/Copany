"use client";

import { useDiscussionLabelsByIds } from "@/hooks/discussionLabels";

interface DiscussionLabelChipsProps {
  labelIds: string[];
  className?: string;
}

export default function DiscussionLabelChips({
  labelIds,
  className = "",
}: DiscussionLabelChipsProps) {
  const { data: labels = [], isLoading } = useDiscussionLabelsByIds(labelIds);

  if (isLoading) {
    return (
      <div className={`flex gap-1 ${className}`}>
        {labelIds.map((_, index) => (
          <div
            key={index}
            className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (labels.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {labels.map((label) => (
        <div
          key={label.id}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium text-white"
          style={{
            backgroundColor: `${label.color}`,
          }}
        >
          <span>{label.name}</span>
        </div>
      ))}
    </div>
  );
}
