"use client";

import { useMemo } from "react";
import IssuesView from "./IssuesView";
import DiscussionView from "./DiscussionView";
import SecondaryTabView from "@/components/commons/SecondaryTabView";
import CopanyHeader from "@/components/copany/CopanyHeader";
import CopanyRightPanel from "@/components/copany/CopanyRightPanel";
import { Copany } from "@/types/database.types";
import { useTranslations } from "next-intl";
import { useDiscussions } from "@/hooks/discussions";
import { useDiscussionLabels } from "@/hooks/discussionLabels";
import { useIssues } from "@/hooks/issues";

export default function WorksView({ copany }: { copany: Copany }) {
  const t = useTranslations("secondaryTabs");
  const { data: discussionsData } = useDiscussions(copany.id);
  const { data: labels } = useDiscussionLabels(copany.id);
  const { data: issues = [] } = useIssues(copany.id);

  // Check if there's a "Begin idea" discussion
  const hasBeginIdeaDiscussion = useMemo(() => {
    const discussions =
      discussionsData?.pages.flatMap((page) => page.discussions) ?? [];
    const beginIdeaLabelId =
      labels?.find((label) => label.name === "Begin idea")?.id || "";
    return discussions.some((discussion) =>
      discussion.labels.includes(beginIdeaLabelId)
    );
  }, [discussionsData, labels]);

  // Check if copany has GitHub connected and has issues
  const hasGithubAndIssues = useMemo(() => {
    return copany.is_connected_github && issues.length > 0;
  }, [copany.is_connected_github, issues.length]);

  // Adjust tab order:
  // - If GitHub is connected and has issues, always put issues first
  // - Otherwise, if "Begin idea" exists, put discussion first
  const tabs = useMemo(() => {
    const issuesTab = {
      key: "issues",
      label: t("issues"),
      content: <IssuesView copanyId={copany.id} />,
    };
    const discussionTab = {
      key: "discussion",
      label: t("discussion"),
      content: <DiscussionView copanyId={copany.id} />,
    };

    // If GitHub connected and has issues, always put issues first
    if (hasGithubAndIssues) {
      return [issuesTab, discussionTab];
    }

    // Otherwise, if "Begin idea" exists, put discussion first
    return hasBeginIdeaDiscussion
      ? [discussionTab, issuesTab]
      : [issuesTab, discussionTab];
  }, [hasBeginIdeaDiscussion, hasGithubAndIssues, t, copany.id]);
  return (
    <div className="min-h-screen w-full min-w-0 flex flex-col gap-4 px-4">
      <CopanyHeader copany={copany} showCoverImage={false} />
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <SecondaryTabView tabs={tabs} urlParamName="worksTab" />
        </div>
        <div className="w-full lg:w-[340px] xl:w-[360px] flex-shrink-0">
          <CopanyRightPanel
            copanyId={copany.id}
            copany={copany}
            showAbout={true}
            showIssues={true}
            showDiscussions={true}
            showContributions={true}
          />
        </div>
      </div>
    </div>
  );
}
