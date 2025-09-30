"use client";

import { useSelectedLayoutSegment } from "next/navigation";

export default function CopanyLayout({
  children,
  issue,
  discussion,
}: {
  children: React.ReactNode;
  issue: React.ReactNode;
  discussion: React.ReactNode;
}) {
  // Only show overlay when @issue slot has an active segment
  const issueSegment = useSelectedLayoutSegment("issue");
  const showIssueOverlay = issueSegment != null;
  const discussionSegment = useSelectedLayoutSegment("discussion");
  const showDiscussionOverlay = discussionSegment != null;

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Main content with independent scroll */}
      <div className="h-full overflow-y-auto">{children}</div>

      {/* Issue overlay with independent scroll */}
      {showIssueOverlay && !showDiscussionOverlay && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-background-dark overflow-y-auto">
          {issue}
        </div>
      )}

      {/* Discussion overlay with independent scroll */}
      {showDiscussionOverlay && !showIssueOverlay && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-background-dark overflow-y-auto">
          {discussion}
        </div>
      )}
    </div>
  );
}
