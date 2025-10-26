"use client";

import DiscussionDetailView from "@/components/discussion/DiscussionDetailView";

interface DiscussionPageClientProps {
  copanyId: string;
  discussionId: string;
}

export default function DiscussionPageClient({
  copanyId,
  discussionId,
}: DiscussionPageClientProps) {
  return (
    <DiscussionDetailView discussionId={discussionId} copanyId={copanyId} />
  );
}
