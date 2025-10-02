"use client";

import { useSelectedLayoutSegment } from "next/navigation";

export default function CopanyLayout({
  children,
  issue_slot,
  discussion_slot,
}: {
  children: React.ReactNode;
  issue_slot: React.ReactNode;
  discussion_slot: React.ReactNode;
}) {
  const issueSegment = useSelectedLayoutSegment("issue_slot");
  console.log("issueSegment", issueSegment);
  const showIssueOverlay = issueSegment != null;
  const discussionSegment = useSelectedLayoutSegment("discussion_slot");
  console.log("discussionSegment", discussionSegment);
  const showDiscussionOverlay = discussionSegment != null;

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Main content with independent scroll */}
      <div className="h-full overflow-y-auto">{children}</div>

      {/* Issue overlay with independent scroll */}
      {showIssueOverlay && !showDiscussionOverlay && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-background-dark overflow-y-auto">
          {issue_slot}
        </div>
      )}

      {/* Discussion overlay with independent scroll */}
      {showDiscussionOverlay && !showIssueOverlay && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-background-dark overflow-y-auto">
          {discussion_slot}
        </div>
      )}
    </div>
  );
}
