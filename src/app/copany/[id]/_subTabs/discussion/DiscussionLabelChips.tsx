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
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {labels.map((label) => (
        <div className="flex items-center gap-2" key={label.id}>
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: `${label.color}`,
            }}
          />
          {label.name}
        </div>
      ))}
    </div>
  );
}
